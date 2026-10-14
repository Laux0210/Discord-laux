import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryGuildService } from '../../src/renderer/src/services/guild-service';
import { PermissionFlags } from '../../src/common/permissions';

describe('InMemoryGuildService - Comunidades e Canais', () => {
  let service: InMemoryGuildService;
  const ownerId = 'user-owner';
  const memberId = 'user-member';
  const outsiderId = 'user-outsider';

  beforeEach(() => {
    service = new InMemoryGuildService();
  });

  it('cria comunidade com owner, cargo @everyone e canal #geral padrão', async () => {
    const guild = await service.createGuild({
      name: 'Comunidade dos Amigos',
      ownerId
    });

    expect(guild.id).toBeDefined();
    expect(guild.name).toBe('Comunidade dos Amigos');
    expect(guild.ownerId).toBe(ownerId);

    // Membro owner cadastrado
    const members = await service.getGuildMembers(guild.id);
    expect(members.length).toBe(1);
    expect(members[0].userId).toBe(ownerId);
    expect(members[0].roleIds).toContain(guild.id); // role @everyone tem o mesmo id da guilda

    // Canal geral padrão criado
    const channels = await service.getGuildChannels(guild.id, ownerId);
    expect(channels.length).toBe(1);
    expect(channels[0].name).toBe('geral');
    expect(channels[0].type).toBe('text');
  });

  it('lista as comunidades associadas a um usuário', async () => {
    const g1 = await service.createGuild({ name: 'Guild 1', ownerId });
    const g2 = await service.createGuild({ name: 'Guild 2', ownerId: memberId });

    const ownerGuilds = await service.getUserGuilds(ownerId);
    expect(ownerGuilds.map((g) => g.id)).toContain(g1.id);
    expect(ownerGuilds.map((g) => g.id)).not.toContain(g2.id);

    const memberGuilds = await service.getUserGuilds(memberId);
    expect(memberGuilds.map((g) => g.id)).toContain(g2.id);
  });

  it('permite criação de canal pelo dono ou por membro com MANAGE_CHANNELS', async () => {
    const guild = await service.createGuild({ name: 'Tech Guild', ownerId });

    // Criar canal pelo dono
    const chanVoice = await service.createChannel({
      guildId: guild.id,
      name: 'Voz Principal',
      type: 'voice',
      actorId: ownerId
    });
    expect(chanVoice.id).toBeDefined();
    expect(chanVoice.type).toBe('voice');

    // Adicionar membro com cargo que possui MANAGE_CHANNELS
    const roleMod = await service.createRole({
      guildId: guild.id,
      name: 'Moderador',
      position: 1,
      permissions: PermissionFlags.MANAGE_CHANNELS,
      actorId: ownerId
    });

    service.addMemberDirect(guild.id, memberId);
    await service.assignRole({
      guildId: guild.id,
      targetUserId: memberId,
      roleId: roleMod.id,
      actorId: ownerId
    });

    // Membro moderador cria canal
    const chanMod = await service.createChannel({
      guildId: guild.id,
      name: 'mod-chat',
      type: 'text',
      actorId: memberId
    });
    expect(chanMod.id).toBeDefined();

    // Membro outsider (apenas @everyone, sem MANAGE_CHANNELS) é rejeitado
    service.addMemberDirect(guild.id, outsiderId);
    await expect(
      service.createChannel({
        guildId: guild.id,
        name: 'hacker-chan',
        type: 'text',
        actorId: outsiderId
      })
    ).rejects.toThrow(/Permissão insuficiente: requer MANAGE_CHANNELS/i);
  });

  it('rejeita exclusão de canal por ator sem MANAGE_CHANNELS', async () => {
    const guild = await service.createGuild({ name: 'Guild Del', ownerId });
    const channel = await service.createChannel({
      guildId: guild.id,
      name: 'temp',
      type: 'text',
      actorId: ownerId
    });

    service.addMemberDirect(guild.id, outsiderId);
    await expect(
      service.deleteChannel(channel.id, outsiderId)
    ).rejects.toThrow(/Permissão insuficiente: requer MANAGE_CHANNELS/i);

    const deleted = await service.deleteChannel(channel.id, ownerId);
    expect(deleted).toBe(true);

    const channels = await service.getGuildChannels(guild.id, ownerId);
    expect(channels.find((c) => c.id === channel.id)).toBeUndefined();
  });

  it('filtra canais visíveis respeitando overrides de VIEW_CHANNEL', async () => {
    const guild = await service.createGuild({ name: 'Secret Guild', ownerId });
    service.addMemberDirect(guild.id, memberId);

    // Cria canal secreto onde @everyone tem VIEW_CHANNEL negado
    const secretChan = await service.createChannel({
      guildId: guild.id,
      name: 'sala-secreta',
      type: 'text',
      actorId: ownerId
    });

    service.setChannelOverride(secretChan.id, {
      targetId: guild.id,
      targetType: 'role',
      allow: 0n,
      deny: PermissionFlags.VIEW_CHANNEL
    });

    // Dono ainda enxerga o canal secreto
    const ownerView = await service.getGuildChannels(guild.id, ownerId);
    expect(ownerView.map((c) => c.id)).toContain(secretChan.id);

    // Membro comum não enxerga o canal secreto
    const memberView = await service.getGuildChannels(guild.id, memberId);
    expect(memberView.map((c) => c.id)).not.toContain(secretChan.id);
  });
});
