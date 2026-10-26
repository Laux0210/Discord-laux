import { describe, expect, it } from 'vitest';
import { InMemoryGuildService } from '../../src/renderer/src/services/guild-service';
import { PermissionFlags } from '../../src/common/permissions';
import type { StorageAdapter } from '../../src/renderer/src/services/storage-service';

function adapter() {
  const values = new Map<string, string>();
  let fail = false;
  const storage: StorageAdapter = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => { if (fail) throw new Error('Disco cheio'); values.set(key, value); }
  };
  return { storage, values, setFail: (value: boolean) => { fail = value; } };
}

describe('comunidade persistente', () => {
  it('mantém servidor/canais estáveis após reiniciar e não transforma visitante em dono', async () => {
    const { storage } = adapter();
    const before = new InMemoryGuildService(storage);
    const guild = await before.ensureCommonGuild('alice', 'alice');
    await before.ensureCommonGuild('bob', 'bob');
    const channels = await before.getGuildChannels(guild.id, 'alice');
    const after = new InMemoryGuildService(storage);
    expect(await after.ensureCommonGuild('charlie', 'charlie')).toMatchObject({ id: guild.id, ownerId: 'alice' });
    expect(await after.getUserGuilds('bob')).toEqual([guild]);
    expect(await after.getGuildChannels(guild.id, 'charlie')).toEqual(channels);
    await expect(after.createChannel({ guildId: guild.id, actorId: 'charlie', name: 'invasão', type: 'text' }))
      .rejects.toThrow(/MANAGE_CHANNELS/);
  });

  it('restaura canais de texto/voz, cargos bigint, atribuições e overrides', async () => {
    const { storage, values } = adapter();
    const service = new InMemoryGuildService(storage);
    const guild = await service.ensureCommonGuild('alice', 'alice');
    await service.ensureCommonGuild('bob');
    const text = await service.createChannel({ guildId: guild.id, actorId: 'alice', name: 'persistente', type: 'text' });
    const voice = await service.createChannel({ guildId: guild.id, actorId: 'alice', name: 'sala de áudio', type: 'voice' });
    const role = await service.createRole({ guildId: guild.id, actorId: 'alice', name: 'Moderador', position: 5, permissions: PermissionFlags.MANAGE_CHANNELS, color: '#123456' });
    await service.assignRole({ guildId: guild.id, actorId: 'alice', targetUserId: 'bob', roleId: role.id });
    service.setChannelOverride(text.id, { targetId: 'bob', targetType: 'member', allow: 0n, deny: PermissionFlags.SEND_MESSAGES });
    const after = new InMemoryGuildService(storage);
    expect(await after.getGuildChannels(guild.id, 'bob')).toEqual(expect.arrayContaining([expect.objectContaining({ id: text.id }), expect.objectContaining({ id: voice.id, type: 'voice' })]));
    expect(await after.getGuildRoles(guild.id)).toContainEqual(role);
    expect((await after.getMemberPermissions(guild.id, 'bob', text.id)) & PermissionFlags.SEND_MESSAGES).toBe(0n);
    expect((await after.getMemberPermissions(guild.id, 'bob')) & PermissionFlags.MANAGE_CHANNELS).toBe(PermissionFlags.MANAGE_CHANNELS);
    expect(values.get('discord_laux_v1_guild_state')).toContain('"permissions":"16"');
  });

  it('não permite conceder permissões ausentes do próprio cargo', async () => {
    const service = new InMemoryGuildService();
    const guild = await service.ensureCommonGuild('alice', 'alice');
    await service.ensureCommonGuild('bob');
    const role = await service.createRole({ guildId: guild.id, actorId: 'alice', name: 'Gerente', position: 10, permissions: PermissionFlags.MANAGE_ROLES });
    await service.assignRole({ guildId: guild.id, actorId: 'alice', targetUserId: 'bob', roleId: role.id });
    await expect(service.createRole({ guildId: guild.id, actorId: 'bob', name: 'Escalada', position: 1, permissions: PermissionFlags.ADMINISTRATOR }))
      .rejects.toThrow(/não pode conceder/);
  });

  it('gerente não atribui cargo administrador inferior a si ou a outro membro', async () => {
    const service = new InMemoryGuildService();
    const guild = await service.ensureCommonGuild('owner', 'owner');
    await service.ensureCommonGuild('manager');
    await service.ensureCommonGuild('target');
    const managerRole = await service.createRole({ guildId: guild.id, actorId: 'owner', name: 'Gerente', position: 100, permissions: PermissionFlags.MANAGE_ROLES });
    const adminRole = await service.createRole({ guildId: guild.id, actorId: 'owner', name: 'Admin baixo', position: 10, permissions: PermissionFlags.ADMINISTRATOR });
    await service.assignRole({ guildId: guild.id, actorId: 'owner', targetUserId: 'manager', roleId: managerRole.id });
    for (const targetUserId of ['manager', 'target']) {
      await expect(service.assignRole({ guildId: guild.id, actorId: 'manager', targetUserId, roleId: adminRole.id }))
        .rejects.toThrow(/não pode conceder|hierarquia/);
    }
    const members = await service.getGuildMembers(guild.id);
    expect(members.find(member => member.userId === 'manager')?.roleIds).not.toContain(adminRole.id);
    expect(members.find(member => member.userId === 'target')?.roleIds).not.toContain(adminRole.id);
    expect((await service.getMemberPermissions(guild.id, 'manager')) & PermissionFlags.ADMINISTRATOR).toBe(0n);
  });

  it('gerente não gerencia membro igual/superior nem remove @everyone', async () => {
    const service = new InMemoryGuildService();
    const guild = await service.ensureCommonGuild('owner', 'owner');
    for (const id of ['manager', 'peer', 'superior']) await service.ensureCommonGuild(id);
    const managerRole = await service.createRole({ guildId: guild.id, actorId: 'owner', name: 'Gerente', position: 100, permissions: PermissionFlags.MANAGE_ROLES });
    const seniorRole = await service.createRole({ guildId: guild.id, actorId: 'owner', name: 'Sênior', position: 200, permissions: PermissionFlags.MANAGE_ROLES });
    const lowRole = await service.createRole({ guildId: guild.id, actorId: 'owner', name: 'Auxiliar', position: 10, permissions: PermissionFlags.SEND_MESSAGES });
    for (const id of ['manager', 'peer']) await service.assignRole({ guildId: guild.id, actorId: 'owner', targetUserId: id, roleId: managerRole.id });
    await service.assignRole({ guildId: guild.id, actorId: 'owner', targetUserId: 'superior', roleId: seniorRole.id });
    for (const targetUserId of ['peer', 'superior']) {
      await expect(service.assignRole({ guildId: guild.id, actorId: 'manager', targetUserId, roleId: lowRole.id })).rejects.toThrow(/hierarquia/);
      await expect(service.removeRole({ guildId: guild.id, actorId: 'manager', targetUserId, roleId: lowRole.id })).rejects.toThrow(/hierarquia/);
    }
    await expect(service.removeRole({ guildId: guild.id, actorId: 'owner', targetUserId: 'manager', roleId: guild.id })).rejects.toThrow(/CARGO_BASE/);
    expect((await service.getGuildMembers(guild.id)).find(member => member.userId === 'manager')?.roleIds).toContain(guild.id);
  });

  it('reverte estado em falha de escrita e mantém o último snapshot íntegro', async () => {
    const store = adapter();
    const service = new InMemoryGuildService(store.storage);
    const guild = await service.ensureCommonGuild('alice', 'alice');
    const before = await service.getGuildChannels(guild.id, 'alice');
    store.setFail(true);
    await expect(service.createChannel({ guildId: guild.id, actorId: 'alice', name: 'não salvo', type: 'voice' })).rejects.toThrow('Disco cheio');
    expect(await service.getGuildChannels(guild.id, 'alice')).toEqual(before);
    await expect(service.ensureCommonGuild('bob')).rejects.toThrow('Disco cheio');
    expect((await service.getGuildMembers(guild.id)).some(member => member.userId === 'bob')).toBe(false);
    store.setFail(false);
    const after = new InMemoryGuildService(store.storage);
    expect(await after.getGuildChannels(guild.id, 'alice')).toEqual(before);
  });

  it('retorna cópias que não permitem alterar canais ou permissões sem mutação autorizada', async () => {
    const service = new InMemoryGuildService();
    const guild = await service.ensureCommonGuild('alice', 'alice');
    const channels = await service.getGuildChannels(guild.id, 'alice');
    channels[0].name = 'alterado externamente';
    const roles = await service.getGuildRoles(guild.id);
    roles[0].permissions = PermissionFlags.ADMINISTRATOR;
    expect((await service.getGuildChannels(guild.id, 'alice'))[0].name).toBe('geral');
    expect((await service.getGuildRoles(guild.id))[0].permissions).not.toBe(PermissionFlags.ADMINISTRATOR);
  });
});
