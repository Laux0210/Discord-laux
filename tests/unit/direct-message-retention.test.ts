import { afterEach, describe, expect, it, vi } from 'vitest';
import { InMemoryFriendshipService, RETENTION_PERIOD_MS } from '../../src/renderer/src/services/friendship-service';

afterEach(() => vi.useRealTimers());

async function conversation() {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-01T12:00:00Z'));
  const service = new InMemoryFriendshipService();
  await service.sendFriendRequest('alice', 'bob');
  await service.acceptFriendRequest('bob', 'alice');
  const channel = await service.getOrCreateDmChannel('alice', 'bob');
  const params = { dmChannelId: channel.id, authorId: 'alice', authorName: 'Alice', content: 'Original', nonce: 'attempt-1' };
  const message = await service.sendDmMessage(params);
  return { service, channel, params, message };
}

describe('DM: fronteira de retenção e cópias de resultados', () => {
  it('exibe até um milissegundo antes e oculta exatamente aos dez dias', async () => {
    const { service, channel, message } = await conversation();
    vi.setSystemTime(message.createdAt + RETENTION_PERIOD_MS - 1);
    expect(await service.getDmMessages(channel.id, 'bob')).toHaveLength(1);
    vi.setSystemTime(message.createdAt + RETENTION_PERIOD_MS);
    expect(await service.getDmMessages(channel.id, 'bob')).toEqual([]);
  });

  it.each([0, 1])('nonce vencido não recupera o texto antigo, na fronteira +%d ms', async (offset) => {
    const { service, channel, params, message } = await conversation();
    vi.setSystemTime(message.createdAt + RETENTION_PERIOD_MS + offset);
    const replay = await service.sendDmMessage({ ...params, content: 'Nova tentativa explícita' });
    expect(replay.id).not.toBe(message.id);
    expect(replay.content).toBe('Nova tentativa explícita');
    expect(await service.getDmMessages(channel.id, 'bob')).toEqual([replay]);
  });

  it.each(['novo envio', 'replay', 'leitura'] as const)('mutar o resultado de %s não altera o histórico', async (route) => {
    const { service, channel, params, message } = await conversation();
    const returned = route === 'novo envio' ? message
      : route === 'replay' ? await service.sendDmMessage(params)
      : (await service.getDmMessages(channel.id, 'bob'))[0];
    returned.content = 'Alteração indevida';
    returned.createdAt = Date.now() + RETENTION_PERIOD_MS;
    returned.authorId = 'spy';
    expect(await service.getDmMessages(channel.id, 'bob')).toEqual([
      expect.objectContaining({ content: 'Original', authorId: 'alice', createdAt: Date.parse('2026-10-01T12:00:00Z') })
    ]);
    expect((await service.sendDmMessage(params)).content).toBe('Original');
  });
});
