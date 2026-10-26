import { describe, expect, it, vi } from 'vitest';
import { DesktopChatService } from '../../src/renderer/src/services/desktop-chat-service';
import { StorageService, type StorageAdapter } from '../../src/renderer/src/services/storage-service';
import { InMemoryGuildService } from '../../src/renderer/src/services/guild-service';
import { InMemoryFriendshipService } from '../../src/renderer/src/services/friendship-service';
import { createLocalAppServices } from '../../src/renderer/src/services/local-app-services';

function adapter() {
  const values = new Map<string, string>();
  let fail = false;
  const storage: StorageAdapter = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => { if (fail) throw new Error('Cota excedida'); values.set(key, value); },
    removeItem: key => { values.delete(key); }
  };
  return { storage, values, setFail: (value: boolean) => { fail = value; } };
}

describe('armazenamento de conversas', () => {
  it('reabre canal e mensagem após reconstruir serviços e mantém exclusões', async () => {
    const { storage } = adapter();
    const before = await createLocalAppServices({ storage });
    const guild = (await before.guildService.getUserGuilds('user-1'))[0];
    const general = (await before.guildService.getGuildChannels(guild.id, 'user-1'))[0];
    const sent = await before.chatService.sendMessage({ channelId: general.id, authorId: 'user-1', authorName: 'Alice', content: 'Sobrevive ao F5' });
    const after = await createLocalAppServices({ storage });
    expect((await after.guildService.getUserGuilds('user-1'))[0].id).toBe(guild.id);
    expect(await after.chatService.getMessages(general.id)).toContainEqual(sent);
    await after.chatService.deleteMessage({ messageId: sent.id, requesterId: 'user-1', permissions: 0n });
    expect(await new DesktopChatService(undefined, storage).getMessages(general.id)).not.toContainEqual(sent);
  });

  it('falha de cota não confirma mensagem nem dispara listener', async () => {
    const store = adapter();
    const service = new DesktopChatService(undefined, store.storage);
    const listener = vi.fn();
    service.onNewMessage('chan-general', listener);
    store.setFail(true);
    await expect(service.sendMessage({ channelId: 'chan-general', authorId: 'alice', authorName: 'Alice', content: 'Não salvo' })).rejects.toThrow('Cota excedida');
    expect(await service.getMessages('chan-general')).toEqual([]);
    expect(listener).not.toHaveBeenCalled();
  });

  it('preserva mensagens legadas nos IDs originais sem fundir conversas', async () => {
    const { storage, values } = adapter();
    const legacy = { id: 'old-message', channelId: 'old-channel', authorId: 'alice', authorName: 'Alice', content: 'Antiga', createdAt: Date.now() };
    values.set('discord_laux_v1_channel_messages', JSON.stringify({ 'old-channel': [legacy] }));
    const service = new DesktopChatService(undefined, storage);
    expect(await service.getMessages('old-channel')).toEqual([legacy]);
    expect(await service.getMessages('chan-general')).toEqual([]);
  });

  it('recupera cada conversa legada como canal separado e não recria canal removido', async () => {
    const { storage, values } = adapter();
    const createdAt = Date.now();
    const message = (channelId: string) => ({ id: `message-${channelId}`, channelId, authorId: 'alice', authorName: 'Alice', content: `Histórico ${channelId}`, createdAt });
    values.set('discord_laux_v1_channel_messages', JSON.stringify({ 'old-one': [message('old-one')], 'old-two': [message('old-two')] }));
    const app = await createLocalAppServices({ storage });
    const [guild] = await app.guildService.getUserGuilds('user-1');
    const channels = await app.guildService.getGuildChannels(guild.id, 'user-1');
    expect(channels).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'old-one', name: expect.stringContaining('historico-anterior-') }),
      expect.objectContaining({ id: 'old-two', name: expect.stringContaining('historico-anterior-') })
    ]));
    expect(await app.chatService.getMessages('old-one')).toEqual([message('old-one')]);
    await app.guildService.deleteChannel('old-one', 'user-1');
    const after = await createLocalAppServices({ storage });
    expect((await after.guildService.getGuildChannels(guild.id, 'user-1')).some(channel => channel.id === 'old-one')).toBe(false);
    expect(await after.chatService.getMessages('old-two')).toEqual([message('old-two')]);
  });

  it.each([
    ['discord_laux_v1_guild_state', (storage: StorageAdapter) => new InMemoryGuildService(storage)],
    ['discord_laux_v1_friendship_state', (storage: StorageAdapter) => new InMemoryFriendshipService(storage)],
    ['discord_laux_v1_chat_state', (storage: StorageAdapter) => new DesktopChatService(undefined, storage)]
  ] as const)('não sobrescreve snapshot corrompido em %s', (key, create) => {
    const { storage, values } = adapter();
    const malformed = [
      '', '{corrompido', 'null', '[]', '{}',
      JSON.stringify({ version: 1 }),
      ...[null, false, 0, '', 'texto', {}, []].map(data => JSON.stringify({ version: 1, data }))
    ];
    for (const raw of malformed) {
      // Uma lista vazia é um snapshot de chat válido; objetos vazios não são.
      if (key === 'discord_laux_v1_chat_state' && raw === '{"version":1,"data":[]}') continue;
      values.set(key, raw);
      expect(() => create(storage), `${key}: ${raw}`).toThrow(/ARMAZENAMENTO_INVALIDO/);
      expect(values.get(key)).toBe(raw);
    }
  });

  it('não expõe credenciais na listagem pública nem confirma cadastro não salvo', () => {
    const store = adapter();
    const storage = new StorageService(store.storage);
    const account = { id: 'alice', email: 'alice@example.test', username: 'alice', displayName: 'Alice', password: 'private', provider: 'credentials' as const, createdAt: Date.now() };
    store.setFail(true);
    expect(() => storage.saveAccount(account)).toThrow('Cota excedida');
    expect(storage.getAccount(account.email)).toBeNull();
    store.setFail(false);
    storage.saveAccount(account);
    expect(storage.listKnownUsers()).toContainEqual({ id: 'alice', username: 'alice', displayName: 'Alice' });
    expect(JSON.stringify(storage.listKnownUsers())).not.toContain('private');
    expect(JSON.stringify(storage.listKnownUsers())).not.toContain('@example.test');
  });
});
