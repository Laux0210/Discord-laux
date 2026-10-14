import type { Guild, GuildMember, Channel, Role } from './types';

export type { Guild, GuildMember, Channel, Role };

export const PermissionFlags = {
  CREATE_INSTANT_INVITE: 1n << 0n,
  KICK_MEMBERS: 1n << 1n,
  ADMINISTRATOR: 1n << 3n,
  MANAGE_CHANNELS: 1n << 4n,
  MANAGE_GUILD: 1n << 5n,
  STREAM: 1n << 9n,
  VIEW_CHANNEL: 1n << 10n,
  SEND_MESSAGES: 1n << 11n,
  MANAGE_MESSAGES: 1n << 13n,
  CONNECT: 1n << 20n,
  SPEAK: 1n << 21n,
  MANAGE_ROLES: 1n << 28n
} as const;

export const ALL_PERMISSIONS = Object.values(PermissionFlags).reduce((acc, flag) => acc | flag, 0n);

export interface PermissionContext {
  guild: Guild;
  member: GuildMember;
  roles: Role[];
  channel?: Channel;
}

export function hasPermission(permissions: bigint, flag: bigint): boolean {
  if ((permissions & PermissionFlags.ADMINISTRATOR) === PermissionFlags.ADMINISTRATOR) {
    return true;
  }
  return (permissions & flag) === flag;
}

/**
 * Avaliação canônica de permissões (precedência Discord):
 * 1. Confirmar identidade e participação.
 * 2. Dono do servidor recebe ALL_PERMISSIONS.
 * 3. Cargo com ADMINISTRATOR concede todas as permissões (ignora overrides de canal).
 * 4. Permissões base do @everyone.
 * 5. Unir permissões base de todos os cargos do membro.
 * 6. Se houver canal:
 *    a. Aplicar negações e concessões de @everyone no canal.
 *    b. Unir negações de cargos do membro no canal e subtrair; unir concessões e aplicar.
 *    c. Aplicar negação e concessão específica do membro no canal.
 *    d. Se VIEW_CHANNEL não for concedido, revogar permissões de envio e voz.
 */
export function computePermissions(context: PermissionContext): bigint {
  const { guild, member, roles, channel } = context;

  // 1. Dono do servidor recebe tudo
  if (member.userId === guild.ownerId) {
    return ALL_PERMISSIONS;
  }

  // Identificar role @everyone (id igual ao id da guilda)
  const everyoneRole = roles.find((r) => r.id === guild.id);
  let permissions = everyoneRole ? everyoneRole.permissions : 0n;

  // Unir permissões base dos cargos do membro
  const memberRoles = roles.filter((r) => member.roleIds.includes(r.id));
  for (const role of memberRoles) {
    permissions |= role.permissions;
  }

  // 2. Se tiver ADMINISTRATOR, ignora qualquer override de canal
  if ((permissions & PermissionFlags.ADMINISTRATOR) === PermissionFlags.ADMINISTRATOR) {
    return ALL_PERMISSIONS;
  }

  // Se não foi fornecido canal, retorna permissões em nível de guilda
  if (!channel || !channel.overrides || channel.overrides.length === 0) {
    return permissions;
  }

  const overrides = channel.overrides;

  // 3. Aplicar override do @everyone
  const everyoneOverride = overrides.find((o) => o.targetId === guild.id && o.targetType === 'role');
  if (everyoneOverride) {
    permissions &= ~everyoneOverride.deny;
    permissions |= everyoneOverride.allow;
  }

  // 4. Aplicar overrides dos cargos do membro
  let roleDenies = 0n;
  let roleAllows = 0n;
  for (const role of memberRoles) {
    const roleOverride = overrides.find((o) => o.targetId === role.id && o.targetType === 'role');
    if (roleOverride) {
      roleDenies |= roleOverride.deny;
      roleAllows |= roleOverride.allow;
    }
  }
  permissions &= ~roleDenies;
  permissions |= roleAllows;

  // 5. Aplicar override específico do membro
  const memberOverride = overrides.find((o) => o.targetId === member.userId && o.targetType === 'member');
  if (memberOverride) {
    permissions &= ~memberOverride.deny;
    permissions |= memberOverride.allow;
  }

  // 6. Se VIEW_CHANNEL não estiver concedido, limpa permissões dependentes de visualização
  if ((permissions & PermissionFlags.VIEW_CHANNEL) !== PermissionFlags.VIEW_CHANNEL) {
    permissions &= ~(PermissionFlags.SEND_MESSAGES | PermissionFlags.CONNECT | PermissionFlags.SPEAK | PermissionFlags.STREAM);
  }

  return permissions;
}

export interface ManageRoleContext {
  actorId: string;
  ownerId: string;
  actorHighestPosition: number;
  targetPosition: number;
}

/**
 * Verifica se um membro tem autoridade para gerenciar outro cargo com base na hierarquia.
 */
export function canManageRole(context: ManageRoleContext): boolean {
  if (context.actorId === context.ownerId) {
    return true;
  }
  return context.actorHighestPosition > context.targetPosition;
}
