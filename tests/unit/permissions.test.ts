import { describe, it, expect } from 'vitest';
import {
  PermissionFlags,
  computePermissions,
  canManageRole,
  hasPermission,
  type Guild,
  type GuildMember,
  type Channel,
  type Role,
  ALL_PERMISSIONS
} from '../../src/common/permissions';

describe('Canonical Permission Engine', () => {
  const guild: Guild = {
    id: 'guild-1',
    name: 'Comunidade dos Amigos',
    ownerId: 'user-owner'
  };

  const everyoneRole: Role = {
    id: 'guild-1', // @everyone tem o mesmo ID da guilda
    name: '@everyone',
    position: 0,
    permissions: PermissionFlags.VIEW_CHANNEL | PermissionFlags.SEND_MESSAGES
  };

  const moderatorRole: Role = {
    id: 'role-mod',
    name: 'Moderador',
    position: 10,
    permissions: PermissionFlags.MANAGE_MESSAGES | PermissionFlags.CONNECT | PermissionFlags.SPEAK
  };

  const adminRole: Role = {
    id: 'role-admin',
    name: 'Admin',
    position: 100,
    permissions: PermissionFlags.ADMINISTRATOR
  };

  it('grants all permissions to guild owner unconditionally', () => {
    const ownerMember: GuildMember = {
      userId: 'user-owner',
      guildId: guild.id,
      roleIds: []
    };

    const perms = computePermissions({
      guild,
      member: ownerMember,
      roles: [everyoneRole]
    });

    expect(hasPermission(perms, PermissionFlags.ADMINISTRATOR)).toBe(true);
    expect(perms).toBe(ALL_PERMISSIONS);
  });

  it('bypasses channel overrides when member has ADMINISTRATOR', () => {
    const adminMember: GuildMember = {
      userId: 'user-admin',
      guildId: guild.id,
      roleIds: [adminRole.id]
    };

    const restrictedChannel: Channel = {
      id: 'chan-secret',
      guildId: guild.id,
      name: 'sala-secreta',
      overrides: [
        {
          targetId: everyoneRole.id,
          targetType: 'role',
          deny: PermissionFlags.VIEW_CHANNEL | PermissionFlags.SEND_MESSAGES,
          allow: 0n
        }
      ]
    };

    const perms = computePermissions({
      guild,
      member: adminMember,
      roles: [everyoneRole, adminRole],
      channel: restrictedChannel
    });

    expect(hasPermission(perms, PermissionFlags.VIEW_CHANNEL)).toBe(true);
    expect(hasPermission(perms, PermissionFlags.SEND_MESSAGES)).toBe(true);
  });

  it('denies permissions based on @everyone channel override', () => {
    const member: GuildMember = {
      userId: 'user-normal',
      guildId: guild.id,
      roleIds: []
    };

    const readOnlyChannel: Channel = {
      id: 'chan-announcements',
      guildId: guild.id,
      name: 'avisos',
      overrides: [
        {
          targetId: everyoneRole.id,
          targetType: 'role',
          deny: PermissionFlags.SEND_MESSAGES,
          allow: 0n
        }
      ]
    };

    const perms = computePermissions({
      guild,
      member,
      roles: [everyoneRole],
      channel: readOnlyChannel
    });

    expect(hasPermission(perms, PermissionFlags.VIEW_CHANNEL)).toBe(true);
    expect(hasPermission(perms, PermissionFlags.SEND_MESSAGES)).toBe(false);
  });

  it('allows role grant to override another role denial in channel', () => {
    const djRole: Role = {
      id: 'role-dj',
      name: 'DJ',
      position: 5,
      permissions: 0n
    };

    const member: GuildMember = {
      userId: 'user-vip',
      guildId: guild.id,
      roleIds: [moderatorRole.id, djRole.id]
    };

    const voiceChannel: Channel = {
      id: 'chan-voice-1',
      guildId: guild.id,
      name: 'Voz Principal',
      overrides: [
        {
          targetId: moderatorRole.id,
          targetType: 'role',
          deny: PermissionFlags.SPEAK,
          allow: 0n
        },
        {
          targetId: djRole.id,
          targetType: 'role',
          deny: 0n,
          allow: PermissionFlags.SPEAK
        }
      ]
    };

    const perms = computePermissions({
      guild,
      member,
      roles: [everyoneRole, moderatorRole, djRole],
      channel: voiceChannel
    });

    // Concessão de cargo prevalece sobre negação de outro cargo
    expect(hasPermission(perms, PermissionFlags.SPEAK)).toBe(true);
  });

  it('member-specific override takes precedence over role overrides', () => {
    const member: GuildMember = {
      userId: 'user-muted',
      guildId: guild.id,
      roleIds: [moderatorRole.id]
    };

    const channel: Channel = {
      id: 'chan-chat',
      guildId: guild.id,
      name: 'geral',
      overrides: [
        {
          targetId: moderatorRole.id,
          targetType: 'role',
          deny: 0n,
          allow: PermissionFlags.SEND_MESSAGES
        },
        {
          targetId: member.userId,
          targetType: 'member',
          deny: PermissionFlags.SEND_MESSAGES,
          allow: 0n
        }
      ]
    };

    const perms = computePermissions({
      guild,
      member,
      roles: [everyoneRole, moderatorRole],
      channel
    });

    // Override de membro negando SEND_MESSAGES prevalece sobre concessão do cargo
    expect(hasPermission(perms, PermissionFlags.SEND_MESSAGES)).toBe(false);
  });

  it('clears send/speak/stream if VIEW_CHANNEL is not granted', () => {
    const member: GuildMember = {
      userId: 'user-hidden',
      guildId: guild.id,
      roleIds: []
    };

    const hiddenChannel: Channel = {
      id: 'chan-hidden',
      guildId: guild.id,
      name: 'oculto',
      overrides: [
        {
          targetId: everyoneRole.id,
          targetType: 'role',
          deny: PermissionFlags.VIEW_CHANNEL,
          allow: PermissionFlags.SEND_MESSAGES | PermissionFlags.CONNECT
        }
      ]
    };

    const perms = computePermissions({
      guild,
      member,
      roles: [everyoneRole],
      channel: hiddenChannel
    });

    expect(hasPermission(perms, PermissionFlags.VIEW_CHANNEL)).toBe(false);
    expect(hasPermission(perms, PermissionFlags.SEND_MESSAGES)).toBe(false);
    expect(hasPermission(perms, PermissionFlags.CONNECT)).toBe(false);
  });

  it('enforces hierarchy when managing roles', () => {
    const ownerId = 'owner';
    const managerId = 'manager';

    // Dono pode gerenciar qualquer cargo
    expect(canManageRole({ actorId: ownerId, ownerId, actorHighestPosition: 50, targetPosition: 99 })).toBe(true);

    // Gestor não pode gerenciar cargo de posição igual ou superior à sua
    expect(canManageRole({ actorId: managerId, ownerId, actorHighestPosition: 50, targetPosition: 50 })).toBe(false);
    expect(canManageRole({ actorId: managerId, ownerId, actorHighestPosition: 50, targetPosition: 60 })).toBe(false);

    // Gestor pode gerenciar cargo de posição estritamente inferior
    expect(canManageRole({ actorId: managerId, ownerId, actorHighestPosition: 50, targetPosition: 49 })).toBe(true);
  });
});
