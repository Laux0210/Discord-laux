import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryGuildService } from '../../src/renderer/src/services/guild-service';
import { PermissionFlags } from '../../src/common/permissions';

describe('Hierarquia de Cargos e Administração', () => {
  let service: InMemoryGuildService;
  const ownerId = 'user-owner';
  const adminId = 'user-admin';
  const modId = 'user-mod';
  const targetUserId = 'user-target';

  beforeEach(async () => {
    service = new InMemoryGuildService();
  });

  it('dono do servidor tem autoridade máxima sobre qualquer posição de cargo', async () => {
    const guild = await service.createGuild({ name: 'Império', ownerId });

    // Dono cria cargo de nível 100
    const roleGod = await service.createRole({
      guildId: guild.id,
      name: 'Supremo',
      position: 100,
      permissions: PermissionFlags.ADMINISTRATOR,
      actorId: ownerId
    });
    expect(roleGod.id).toBeDefined();

    // Dono atribui o cargo ao admin
    service.addMemberDirect(guild.id, adminId);
    const assigned = await service.assignRole({
      guildId: guild.id,
      targetUserId: adminId,
      roleId: roleGod.id,
      actorId: ownerId
    });
    expect(assigned).toBe(true);

    const members = await service.getGuildMembers(guild.id);
    const adminMember = members.find((m) => m.userId === adminId);
    expect(adminMember?.roleIds).toContain(roleGod.id);
  });

  it('bloqueia criação de cargo com posição maior ou igual ao cargo do ator (não-dono)', async () => {
    const guild = await service.createGuild({ name: 'Comunidade Hierárquica', ownerId });

    // Dono cria cargo Moderador pos 10
    const roleMod = await service.createRole({
      guildId: guild.id,
      name: 'Moderador',
      position: 10,
      permissions: PermissionFlags.MANAGE_ROLES,
      actorId: ownerId
    });

    service.addMemberDirect(guild.id, modId);
    await service.assignRole({
      guildId: guild.id,
      targetUserId: modId,
      roleId: roleMod.id,
      actorId: ownerId
    });

    // Moderador (pos 10) tenta criar cargo pos 15 -> REJEITADO
    await expect(
      service.createRole({
        guildId: guild.id,
        name: 'Super Mod',
        position: 15,
        permissions: PermissionFlags.MANAGE_ROLES,
        actorId: modId
      })
    ).rejects.toThrow(/Violação de hierarquia: posição do cargo excede o limite do ator/i);

    // Moderador (pos 10) tenta criar cargo pos 10 (igual) -> REJEITADO
    await expect(
      service.createRole({
        guildId: guild.id,
        name: 'Irmão Gêmeo',
        position: 10,
        permissions: PermissionFlags.SEND_MESSAGES,
        actorId: modId
      })
    ).rejects.toThrow(/Violação de hierarquia: posição do cargo excede o limite do ator/i);

    // Moderador (pos 10) cria cargo pos 5 (inferior) -> SUCESSO
    const roleJunior = await service.createRole({
      guildId: guild.id,
      name: 'Ajudante',
      position: 5,
      permissions: PermissionFlags.SEND_MESSAGES,
      actorId: modId
    });
    expect(roleJunior.id).toBeDefined();
  });

  it('bloqueia atribuição de cargo quando a posição for >= à do ator', async () => {
    const guild = await service.createGuild({ name: 'Guild Protegida', ownerId });

    // Dono cria cargo pos 20 e cargo pos 10
    const roleLead = await service.createRole({
      guildId: guild.id,
      name: 'Líder',
      position: 20,
      permissions: PermissionFlags.MANAGE_ROLES,
      actorId: ownerId
    });

    const roleMod = await service.createRole({
      guildId: guild.id,
      name: 'Moderador',
      position: 10,
      permissions: PermissionFlags.MANAGE_ROLES,
      actorId: ownerId
    });

    service.addMemberDirect(guild.id, modId);
    await service.assignRole({
      guildId: guild.id,
      targetUserId: modId,
      roleId: roleMod.id,
      actorId: ownerId
    });

    service.addMemberDirect(guild.id, targetUserId);

    // Moderador (pos 10) tenta atribuir cargo Líder (pos 20) ao target -> BLOQUEADO
    await expect(
      service.assignRole({
        guildId: guild.id,
        targetUserId,
        roleId: roleLead.id,
        actorId: modId
      })
    ).rejects.toThrow(/Violação de hierarquia: não autorizado a atribuir este cargo/i);
  });

  it('bloqueia remoção de cargo quando a posição for >= à do ator', async () => {
    const guild = await service.createGuild({ name: 'Guild Revogação', ownerId });

    const roleLead = await service.createRole({
      guildId: guild.id,
      name: 'Líder',
      position: 20,
      permissions: PermissionFlags.MANAGE_ROLES,
      actorId: ownerId
    });

    const roleMod = await service.createRole({
      guildId: guild.id,
      name: 'Moderador',
      position: 10,
      permissions: PermissionFlags.MANAGE_ROLES,
      actorId: ownerId
    });

    service.addMemberDirect(guild.id, modId);
    await service.assignRole({
      guildId: guild.id,
      targetUserId: modId,
      roleId: roleMod.id,
      actorId: ownerId
    });

    // Dono atribui Líder ao target
    service.addMemberDirect(guild.id, targetUserId);
    await service.assignRole({
      guildId: guild.id,
      targetUserId,
      roleId: roleLead.id,
      actorId: ownerId
    });

    // Moderador (pos 10) tenta remover Líder (pos 20) do target -> BLOQUEADO
    await expect(
      service.removeRole({
        guildId: guild.id,
        targetUserId,
        roleId: roleLead.id,
        actorId: modId
      })
    ).rejects.toThrow(/Violação de hierarquia: não autorizado a remover este cargo/i);

    // Dono remove com sucesso
    const removed = await service.removeRole({
      guildId: guild.id,
      targetUserId,
      roleId: roleLead.id,
      actorId: ownerId
    });
    expect(removed).toBe(true);

    const members = await service.getGuildMembers(guild.id);
    const target = members.find((m) => m.userId === targetUserId);
    expect(target?.roleIds).not.toContain(roleLead.id);
  });

  it('rejeita ações de cargo por membro sem MANAGE_ROLES', async () => {
    const guild = await service.createGuild({ name: 'Guild Sem Perms', ownerId });
    service.addMemberDirect(guild.id, targetUserId);

    await expect(
      service.createRole({
        guildId: guild.id,
        name: 'Tentativa',
        position: 1,
        permissions: 0n,
        actorId: targetUserId
      })
    ).rejects.toThrow(/Permissão insuficiente: requer MANAGE_ROLES/i);
  });
});
