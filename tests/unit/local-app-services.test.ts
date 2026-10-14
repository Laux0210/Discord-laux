import { afterEach, describe, expect, it, vi } from 'vitest';
import { createLocalAppServices } from '../../src/renderer/src/services/local-app-services';

afterEach(() => vi.restoreAllMocks());

describe('serviços da aplicação local', () => {
  it('inicializa sessão e dados fictícios pelos serviços, sem requisições externas', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Rede proibida'));
    const services = await createLocalAppServices();
    expect(services.authService.getCurrentUser()).toMatchObject({
      id: 'user-1', username: 'amigo-1', displayName: 'Amigo Um (Dono)'
    });
    const guilds = await services.guildService.getUserGuilds('user-1');
    expect(guilds).toHaveLength(1);
    expect(guilds[0]).toMatchObject({ name: 'Comunidade dos Amigos', ownerId: 'user-1' });
    expect((await services.guildService.getGuildMembers(guilds[0].id)).map((m) => m.userId))
      .toEqual(['user-1', 'user-2', 'user-3']);
    const channels = await services.guildService.getGuildChannels(guilds[0].id, 'user-1');
    expect(channels.map(({ name, type }) => ({ name, type }))).toEqual([
      { name: 'geral', type: 'text' }, { name: 'avisos', type: 'text' },
      { name: 'Voz Principal', type: 'voice' }
    ]);
    const general = channels.find((channel) => channel.name === 'geral')!;
    expect(await services.chatService.getMessages(general.id)).toEqual([
      expect.objectContaining({ channelId: general.id, authorId: 'user-2', content: expect.stringContaining('fictícia') })
    ]);
    expect(await services.chatService.getMessages(channels[1].id)).toEqual([]);
    expect(await services.friendshipService.getFriends('user-1')).toEqual([
      { friendId: 'user-2', status: 'accepted' }, { friendId: 'user-3', status: 'pending' }
    ]);
    expect(services.presenceService.getPresence('user-2')).toBe('online');
    expect(services.mediaService.getParticipants()).toEqual([]);
    expect(services.callController.getCallState()).toEqual({
      channelId: null, guildId: null, participants: [], activeScreenShareUserId: null, startedAt: null
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('mantém sessão, comunidades, mensagens, amizades, presença e chamada isoladas entre montagens', async () => {
    const a = await createLocalAppServices();
    const b = await createLocalAppServices();
    const [guildA] = await a.guildService.getUserGuilds('user-1');
    const [guildB] = await b.guildService.getUserGuilds('user-1');
    const [generalA] = await a.guildService.getGuildChannels(guildA.id, 'user-1');
    const [generalB] = await b.guildService.getGuildChannels(guildB.id, 'user-1');
    await a.authService.logout();
    await a.guildService.createGuild({ name: 'Somente A', ownerId: 'user-1' });
    await a.chatService.sendMessage({ channelId: generalA.id, authorId: 'user-1', authorName: 'Amigo Um', content: 'Só A' });
    await a.friendshipService.removeFriendship('user-1', 'user-2');
    a.presenceService.setPresence('user-2', 'offline');
    await a.mediaService.joinCall('user-1', 'Amigo Um');
    const voiceA = (await a.guildService.getGuildChannels(guildA.id, 'user-1'))
      .find((channel) => channel.type === 'voice')!;
    expect(await a.callController.joinCall(voiceA.id, guildA.id, 'user-1', 'Amigo Um')).toBe(true);
    expect(a.callController.getCallState()).toMatchObject({
      channelId: voiceA.id, guildId: guildA.id,
      participants: [expect.objectContaining({ userId: 'user-1', displayName: 'Amigo Um' })]
    });
    expect(b.authService.getCurrentUser()?.id).toBe('user-1');
    expect(await b.guildService.getUserGuilds('user-1')).toHaveLength(1);
    expect(await b.chatService.getMessages(generalB.id)).toHaveLength(1);
    expect(await b.friendshipService.getFriends('user-1')).toContainEqual({ friendId: 'user-2', status: 'accepted' });
    expect(b.presenceService.getPresence('user-2')).toBe('online');
    expect(b.mediaService.getParticipants()).toEqual([]);
    expect(b.callController.getCallState()).toEqual({
      channelId: null, guildId: null, participants: [], activeScreenShareUserId: null, startedAt: null
    });
  });
});
