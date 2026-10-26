import type {
  AssignRoleParams,
  CreateChannelParams,
  CreateGuildParams,
  CreateInviteParams,
  CreateRoleParams,
  GuildService,
  InviteInfo
} from '../../../common/guild-types';
import type { Channel, ChannelOverride, Guild, GuildMember, Role } from '../../../common/types';
import {
  ALL_PERMISSIONS,
  canManageRole,
  computePermissions,
  hasPermission,
  PermissionFlags
} from '../../../common/permissions';
import { readSnapshot, type StorageAdapter } from './storage-service';

const GUILD_STORAGE_KEY = 'discord_laux_v1_guild_state';
export const COMMON_GUILD_ID = 'guild-community';

interface GuildSnapshot {
  recoveredLegacyIds?: string[];
  guilds: [string, Guild][];
  members: [string, GuildMember[]][];
  roles: [string, (Omit<Role, 'permissions'> & { permissions: string })[]][];
  channels: [string, (Omit<Channel, 'overrides'> & {
    overrides?: (Omit<ChannelOverride, 'allow' | 'deny'> & { allow: string; deny: string })[];
  })[]][];
  invites: [string, InviteInfo][];
}

function generateId(prefix: string): string {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const arr = new Uint8Array(6);
    crypto.getRandomValues(arr);
    return `${prefix}-${Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('')}`;
  }
  return `${prefix}-${Math.random().toString(36).substring(2, 8)}`;
}

export class InMemoryGuildService implements GuildService {
  private guilds = new Map<string, Guild>();
  private members = new Map<string, GuildMember[]>(); // guildId -> GuildMember[]
  private roles = new Map<string, Role[]>(); // guildId -> Role[]
  private channels = new Map<string, Channel[]>(); // guildId -> Channel[]
  private invites = new Map<string, InviteInfo>(); // code -> InviteInfo
  private recoveredLegacyIds = new Set<string>();

  private committed: GuildSnapshot;

  constructor(private storage?: StorageAdapter) {
    const stored = readSnapshot<GuildSnapshot>(storage, GUILD_STORAGE_KEY);
    if (stored) {
      try { this.restore(stored); }
      catch { throw new Error('ARMAZENAMENTO_INVALIDO: comunidades; dados preservados para recuperação'); }
    }
    this.committed = this.snapshot();
  }

  private snapshot(): GuildSnapshot {
    return JSON.parse(JSON.stringify({
      guilds: [...this.guilds], members: [...this.members], recoveredLegacyIds: [...this.recoveredLegacyIds],
      roles: [...this.roles].map(([id, roles]) => [id, roles.map(role => ({ ...role, permissions: role.permissions.toString() }))]),
      channels: [...this.channels].map(([id, channels]) => [id, channels.map(channel => ({
        ...channel, overrides: channel.overrides?.map(override => ({
          ...override, allow: override.allow.toString(), deny: override.deny.toString()
        }))
      }))]),
      invites: [...this.invites]
    }));
  }

  private restore(value: GuildSnapshot): void {
    const snapshot: GuildSnapshot = JSON.parse(JSON.stringify(value));
    this.guilds = new Map(snapshot.guilds);
    this.recoveredLegacyIds = new Set(snapshot.recoveredLegacyIds ?? []);
    this.members = new Map(snapshot.members);
    this.roles = new Map(snapshot.roles.map(([id, roles]) => [id, roles.map(role => ({
      ...role, permissions: BigInt(role.permissions)
    }))]));
    this.channels = new Map(snapshot.channels.map(([id, channels]) => [id, channels.map(channel => ({
      ...channel, overrides: channel.overrides?.map(override => ({
        ...override, allow: BigInt(override.allow), deny: BigInt(override.deny)
      }))
    }))]));
    this.invites = new Map(snapshot.invites);
  }

  private persist(): void {
    const next = this.snapshot();
    try { this.storage?.setItem(GUILD_STORAGE_KEY, JSON.stringify({ version: 1, data: next })); }
    catch (error) { this.restore(this.committed); throw error; }
    this.committed = next;
  }

  async ensureCommonGuild(userId: string, ownerId = 'user-1'): Promise<Guild> {
    if (!userId || !ownerId) throw new Error('IDENTIDADE_INVALIDA');
    let guild = this.guilds.get(COMMON_GUILD_ID);
    if (!guild) {
      guild = { id: COMMON_GUILD_ID, name: 'Comunidade dos Amigos', ownerId };
      this.guilds.set(guild.id, guild);
      this.roles.set(guild.id, [{
        id: guild.id, name: '@everyone', position: 0,
        permissions: PermissionFlags.VIEW_CHANNEL | PermissionFlags.SEND_MESSAGES |
          PermissionFlags.CONNECT | PermissionFlags.SPEAK | PermissionFlags.CREATE_INSTANT_INVITE
      }]);
      this.members.set(guild.id, [{ userId: ownerId, guildId: guild.id, roleIds: [guild.id] }]);
      this.channels.set(guild.id, [
        { id: 'chan-general', guildId: guild.id, name: 'geral', type: 'text', position: 0, overrides: [] },
        { id: 'chan-announcements', guildId: guild.id, name: 'avisos', type: 'text', position: 1, overrides: [] },
        { id: 'chan-voice-main', guildId: guild.id, name: 'Voz Principal', type: 'voice', position: 2, overrides: [] }
      ]);
      const list = this.members.get(guild.id)!;
      if (userId !== ownerId) list.push({ userId, guildId: guild.id, roleIds: [guild.id] });
      this.persist();
    } else {
      this.addMemberDirect(guild.id, userId);
    }
    return { ...guild };
  }

  async getGuildRoles(guildId: string): Promise<Role[]> {
    return (this.roles.get(guildId) ?? []).map(role => ({ ...role }));
  }

  /** Migração local: mantém cada ID antigo separado, sem unir nem transmitir históricos. */
  recoverLegacyTextChannels(channelIds: string[], actorId: string): void {
    const guild = this.guilds.get(COMMON_GUILD_ID);
    if (!guild || guild.ownerId !== actorId) throw new Error('Permissão insuficiente para recuperação local');
    const channels = this.channels.get(COMMON_GUILD_ID) ?? [];
    let changed = false;
    for (const id of channelIds) {
      if (!id || id.length > 160 || this.recoveredLegacyIds.has(id) || [...this.channels.values()].some(list => list.some(channel => channel.id === id))) continue;
      channels.push({
        id, guildId: guild.id, type: 'text',
        name: `historico-anterior-${channels.length + 1}`,
        topic: `Histórico recuperado localmente do canal ${id}. Cada conversa anterior permanece separada.`,
        position: channels.length, overrides: []
      });
      this.recoveredLegacyIds.add(id);
      changed = true;
    }
    if (changed) { this.channels.set(guild.id, channels); this.persist(); }
  }

  async getMemberPermissions(guildId: string, userId: string, channelId?: string): Promise<bigint> {
    const guild = this.guilds.get(guildId);
    const member = this.members.get(guildId)?.find(item => item.userId === userId);
    const channel = channelId ? this.channels.get(guildId)?.find(item => item.id === channelId) : undefined;
    if (!guild || !member || (channelId && !channel)) return 0n;
    return computePermissions({ guild, member, roles: this.roles.get(guildId) ?? [], channel });
  }

  async createGuild(params: CreateGuildParams): Promise<Guild> {
    const guildId = generateId('guild');
    const guild: Guild = {
      id: guildId,
      name: params.name,
      ownerId: params.ownerId,
      iconUrl: params.iconUrl
    };

    this.guilds.set(guildId, guild);

    // 1. Cria cargo base @everyone (id igual ao id da guilda)
    const everyoneRole: Role = {
      id: guildId,
      name: '@everyone',
      position: 0,
      permissions:
        PermissionFlags.VIEW_CHANNEL |
        PermissionFlags.SEND_MESSAGES |
        PermissionFlags.CONNECT |
        PermissionFlags.SPEAK |
        PermissionFlags.CREATE_INSTANT_INVITE
    };
    this.roles.set(guildId, [everyoneRole]);

    // 2. Adiciona dono aos membros com cargo @everyone
    const ownerMember: GuildMember = {
      userId: params.ownerId,
      guildId,
      roleIds: [everyoneRole.id]
    };
    this.members.set(guildId, [ownerMember]);

    // 3. Cria canal padrão #geral
    const defaultChannel: Channel = {
      id: generateId('chan'),
      guildId,
      name: 'geral',
      type: 'text',
      topic: 'Canal de conversa geral da comunidade',
      position: 0,
      overrides: []
    };
    this.channels.set(guildId, [defaultChannel]);

    this.persist();
    return { ...guild };
  }

  async getGuild(guildId: string): Promise<Guild | null> {
    const guild = this.guilds.get(guildId);
    return guild ? { ...guild } : null;
  }

  async getUserGuilds(userId: string): Promise<Guild[]> {
    const result: Guild[] = [];
    for (const [guildId, memberList] of this.members.entries()) {
      if (memberList.some((m) => m.userId === userId)) {
        const guild = this.guilds.get(guildId);
        if (guild) result.push({ ...guild });
      }
    }
    return result;
  }

  async getGuildMembers(guildId: string): Promise<GuildMember[]> {
    return (this.members.get(guildId) ?? []).map((m) => ({ ...m, roleIds: [...m.roleIds] }));
  }

  addMemberDirect(guildId: string, userId: string, nickname?: string): GuildMember {
    if (!this.guilds.has(guildId)) throw new Error('Comunidade não encontrada');
    const list = this.members.get(guildId) ?? [];
    const existing = list.find((m) => m.userId === userId);
    if (existing) return { ...existing, roleIds: [...existing.roleIds] };

    const newMember: GuildMember = {
      guildId,
      userId,
      nickname,
      roleIds: [guildId] // @everyone
    };
    list.push(newMember);
    this.members.set(guildId, list);
    this.persist();
    return { ...newMember, roleIds: [...newMember.roleIds] };
  }

  async createChannel(params: CreateChannelParams): Promise<Channel> {
    if (!params.name?.trim() || params.name.trim().length > 100 || !['text', 'voice'].includes(params.type)) {
      throw new Error('CANAL_INVALIDO: informe nome de até 100 caracteres e tipo texto ou voz');
    }
    const guild = this.guilds.get(params.guildId);
    if (!guild) throw new Error('Comunidade não encontrada');

    const member = (this.members.get(params.guildId) ?? []).find((m) => m.userId === params.actorId);
    if (!member) throw new Error('Usuário não é membro desta comunidade');

    const roles = this.roles.get(params.guildId) ?? [];
    const perms = computePermissions({ guild, member, roles });

    if (!hasPermission(perms, PermissionFlags.MANAGE_CHANNELS)) {
      throw new Error('Permissão insuficiente: requer MANAGE_CHANNELS');
    }

    const channelList = this.channels.get(params.guildId) ?? [];
    const newChan: Channel = {
      id: generateId('chan'),
      guildId: params.guildId,
      name: params.name.trim(),
      type: params.type,
      topic: params.topic,
      position: channelList.length,
      overrides: []
    };
    channelList.push(newChan);
    this.channels.set(params.guildId, channelList);
    this.persist();
    return { ...newChan, overrides: [] };
  }

  async deleteChannel(channelId: string, actorId: string): Promise<boolean> {
    let targetGuildId: string | null = null;
    let targetChan: Channel | null = null;

    for (const [gId, chanList] of this.channels.entries()) {
      const found = chanList.find((c) => c.id === channelId);
      if (found) {
        targetGuildId = gId;
        targetChan = found;
        break;
      }
    }

    if (!targetGuildId || !targetChan) throw new Error('Canal não encontrado');

    const guild = this.guilds.get(targetGuildId)!;
    const member = (this.members.get(targetGuildId) ?? []).find((m) => m.userId === actorId);
    if (!member) throw new Error('Usuário não é membro desta comunidade');

    const roles = this.roles.get(targetGuildId) ?? [];
    const perms = computePermissions({ guild, member, roles, channel: targetChan });

    if (!hasPermission(perms, PermissionFlags.MANAGE_CHANNELS)) {
      throw new Error('Permissão insuficiente: requer MANAGE_CHANNELS');
    }

    const list = this.channels.get(targetGuildId)!;
    this.channels.set(
      targetGuildId,
      list.filter((c) => c.id !== channelId)
    );
    this.persist();
    return true;
  }

  async getGuildChannels(guildId: string, actorId: string): Promise<Channel[]> {
    const guild = this.guilds.get(guildId);
    if (!guild) return [];

    const member = (this.members.get(guildId) ?? []).find((m) => m.userId === actorId);
    if (!member) return [];

    const roles = this.roles.get(guildId) ?? [];
    const allChannels = this.channels.get(guildId) ?? [];

    return allChannels.filter((channel) => {
      const perms = computePermissions({ guild, member, roles, channel });
      return hasPermission(perms, PermissionFlags.VIEW_CHANNEL);
    }).map(channel => ({ ...channel, overrides: channel.overrides?.map(override => ({ ...override })) }));
  }

  setChannelOverride(channelId: string, override: ChannelOverride): void {
    for (const chanList of this.channels.values()) {
      const chan = chanList.find((c) => c.id === channelId);
      if (chan) {
        const overrides = chan.overrides ?? [];
        const index = overrides.findIndex(
          (o) => o.targetId === override.targetId && o.targetType === override.targetType
        );
        if (index >= 0) {
          overrides[index] = override;
        } else {
          overrides.push(override);
        }
        chan.overrides = overrides;
        this.persist();
        return;
      }
    }
  }

  async createRole(params: CreateRoleParams): Promise<Role> {
    if (!params.name?.trim() || params.name.trim().length > 100 || !Number.isInteger(params.position) || params.position <= 0 ||
      typeof params.permissions !== 'bigint' || params.permissions < 0n || (params.permissions & ~ALL_PERMISSIONS) !== 0n) {
      throw new Error('CARGO_INVALIDO: nome, posição ou permissões inválidas');
    }
    const guild = this.guilds.get(params.guildId);
    if (!guild) throw new Error('Comunidade não encontrada');

    const member = (this.members.get(params.guildId) ?? []).find((m) => m.userId === params.actorId);
    if (!member) throw new Error('Usuário não é membro desta comunidade');

    const roles = this.roles.get(params.guildId) ?? [];
    const perms = computePermissions({ guild, member, roles });

    if (!hasPermission(perms, PermissionFlags.MANAGE_ROLES)) {
      throw new Error('Permissão insuficiente: requer MANAGE_ROLES');
    }

    // Regra de hierarquia: ator não dono não pode criar cargo com posição >= a sua posição máxima
    if (params.actorId !== guild.ownerId) {
      if ((params.permissions & ~perms) !== 0n) throw new Error('Permissão insuficiente: não pode conceder permissões que não possui');
      const actorRoles = roles.filter((r) => member.roleIds.includes(r.id));
      const highestPos = Math.max(...actorRoles.map((r) => r.position), 0);
      if (params.position >= highestPos) {
        throw new Error('Violação de hierarquia: posição do cargo excede o limite do ator');
      }
    }

    const newRole: Role = {
      id: generateId('role'),
      name: params.name,
      position: params.position,
      permissions: params.permissions,
      color: params.color
    };

    roles.push(newRole);
    this.roles.set(params.guildId, roles);
    this.persist();
    return { ...newRole };
  }

  async assignRole(params: AssignRoleParams): Promise<boolean> {
    const guild = this.guilds.get(params.guildId);
    if (!guild) throw new Error('Comunidade não encontrada');

    const actor = (this.members.get(params.guildId) ?? []).find((m) => m.userId === params.actorId);
    if (!actor) throw new Error('Ator não é membro desta comunidade');

    const roles = this.roles.get(params.guildId) ?? [];
    const targetRole = roles.find((r) => r.id === params.roleId);
    if (!targetRole) throw new Error('Cargo alvo não encontrado');

    const perms = computePermissions({ guild, member: actor, roles });
    if (!hasPermission(perms, PermissionFlags.MANAGE_ROLES)) {
      throw new Error('Permissão insuficiente: requer MANAGE_ROLES');
    }

    const actorRoles = roles.filter((r) => actor.roleIds.includes(r.id));
    const actorHighestPos = Math.max(...actorRoles.map((r) => r.position), 0);

    if (!canManageRole({
      actorId: params.actorId,
      ownerId: guild.ownerId,
      actorHighestPosition: actorHighestPos,
      targetPosition: targetRole.position
    })) {
      throw new Error('Violação de hierarquia: não autorizado a atribuir este cargo');
    }

    const targetMember = (this.members.get(params.guildId) ?? []).find((m) => m.userId === params.targetUserId);
    if (!targetMember) throw new Error('Membro alvo não encontrado');

    if (params.actorId !== guild.ownerId) {
      const targetHighest = Math.max(0, ...roles.filter(role => targetMember.roleIds.includes(role.id)).map(role => role.position));
      if (targetMember.userId === guild.ownerId || targetHighest >= actorHighestPos) throw new Error('Violação de hierarquia: membro alvo não gerenciável');
      if ((targetRole.permissions & ~perms) !== 0n) throw new Error('Permissão insuficiente: não pode conceder permissões que não possui');
    }

    if (!targetMember.roleIds.includes(params.roleId)) {
      targetMember.roleIds.push(params.roleId);
    }
    this.persist();
    return true;
  }

  async removeRole(params: AssignRoleParams): Promise<boolean> {
    if (params.roleId === params.guildId) throw new Error('CARGO_BASE: @everyone não pode ser removido');
    const guild = this.guilds.get(params.guildId);
    if (!guild) throw new Error('Comunidade não encontrada');

    const actor = (this.members.get(params.guildId) ?? []).find((m) => m.userId === params.actorId);
    if (!actor) throw new Error('Ator não é membro');

    const roles = this.roles.get(params.guildId) ?? [];
    const targetRole = roles.find((r) => r.id === params.roleId);
    if (!targetRole) throw new Error('Cargo não encontrado');

    const perms = computePermissions({ guild, member: actor, roles });
    if (!hasPermission(perms, PermissionFlags.MANAGE_ROLES)) {
      throw new Error('Permissão insuficiente: requer MANAGE_ROLES');
    }

    const actorRoles = roles.filter((r) => actor.roleIds.includes(r.id));
    const actorHighestPos = Math.max(...actorRoles.map((r) => r.position), 0);

    if (!canManageRole({
      actorId: params.actorId,
      ownerId: guild.ownerId,
      actorHighestPosition: actorHighestPos,
      targetPosition: targetRole.position
    })) {
      throw new Error('Violação de hierarquia: não autorizado a remover este cargo');
    }

    const targetMember = (this.members.get(params.guildId) ?? []).find((m) => m.userId === params.targetUserId);
    if (!targetMember) throw new Error('Membro não encontrado');

    if (params.actorId !== guild.ownerId) {
      const targetHighest = Math.max(0, ...roles.filter(role => targetMember.roleIds.includes(role.id)).map(role => role.position));
      if (targetMember.userId === guild.ownerId || targetHighest >= actorHighestPos) throw new Error('Violação de hierarquia: membro alvo não gerenciável');
    }

    targetMember.roleIds = targetMember.roleIds.filter((id) => id !== params.roleId);
    this.persist();
    return true;
  }

  async createInvite(params: CreateInviteParams): Promise<InviteInfo> {
    const guild = this.guilds.get(params.guildId);
    if (!guild) throw new Error('Comunidade não encontrada');

    const member = (this.members.get(params.guildId) ?? []).find((m) => m.userId === params.creatorId);
    if (!member) throw new Error('Usuário não é membro desta comunidade');

    const roles = this.roles.get(params.guildId) ?? [];
    const perms = computePermissions({ guild, member, roles });
    if (!hasPermission(perms, PermissionFlags.CREATE_INSTANT_INVITE)) {
      throw new Error('Permissão insuficiente: requer CREATE_INSTANT_INVITE');
    }

    const code = generateId('INV').toUpperCase();
    const invite: InviteInfo = {
      code,
      guildId: params.guildId,
      guildName: guild.name,
      creatorId: params.creatorId,
      expiresAt: params.expiresInMs ? Date.now() + params.expiresInMs : null,
      maxUses: params.maxUses ?? null,
      uses: 0
    };

    this.invites.set(code, invite);
    this.persist();
    return { ...invite };
  }

  async getInvite(code: string): Promise<InviteInfo | null> {
    const invite = this.invites.get(code);
    return invite ? { ...invite } : null;
  }

  async joinGuildByInvite(code: string, userId: string): Promise<Guild> {
    const invite = this.invites.get(code);
    if (!invite) {
      throw new Error('CONVITE_INEXISTENTE: código de convite não encontrado');
    }

    if (invite.expiresAt !== null && Date.now() > invite.expiresAt) {
      throw new Error('CONVITE_EXPIRADO: este convite já expirou');
    }

    if (invite.maxUses !== null && invite.uses >= invite.maxUses) {
      throw new Error('CONVITE_ESGOTADO: limite de usos atingido');
    }

    const guild = this.guilds.get(invite.guildId);
    if (!guild) {
      throw new Error('Comunidade associada ao convite não existe');
    }

    // Idempotência: se já é membro, retorna a guilda sem incrementar usos
    const memberList = this.members.get(invite.guildId) ?? [];
    if (memberList.some((m) => m.userId === userId)) {
      return guild;
    }

    invite.uses += 1;
    this.addMemberDirect(invite.guildId, userId);
    return guild;
  }
}
