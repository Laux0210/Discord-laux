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
  canManageRole,
  computePermissions,
  hasPermission,
  PermissionFlags
} from '../../../common/permissions';

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

    return guild;
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
    const list = this.members.get(guildId) ?? [];
    const existing = list.find((m) => m.userId === userId);
    if (existing) return existing;

    const newMember: GuildMember = {
      guildId,
      userId,
      nickname,
      roleIds: [guildId] // @everyone
    };
    list.push(newMember);
    this.members.set(guildId, list);
    return newMember;
  }

  async createChannel(params: CreateChannelParams): Promise<Channel> {
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
      name: params.name,
      type: params.type,
      topic: params.topic,
      position: channelList.length,
      overrides: []
    };
    channelList.push(newChan);
    this.channels.set(params.guildId, channelList);
    return newChan;
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
    });
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
        return;
      }
    }
  }

  async createRole(params: CreateRoleParams): Promise<Role> {
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
    return newRole;
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

    if (!targetMember.roleIds.includes(params.roleId)) {
      targetMember.roleIds.push(params.roleId);
    }
    return true;
  }

  async removeRole(params: AssignRoleParams): Promise<boolean> {
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

    targetMember.roleIds = targetMember.roleIds.filter((id) => id !== params.roleId);
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
    return invite;
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
