import { describe, expect, it, vi, afterEach } from 'vitest';
import { InMemoryFriendshipService, RETENTION_PERIOD_MS } from '../../src/renderer/src/services/friendship-service';
import type { StorageAdapter } from '../../src/renderer/src/services/storage-service';

function adapter() {
  const values = new Map<string, string>();
  let fail = false;
  const storage: StorageAdapter = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => { if (fail) throw new Error('Disco cheio'); values.set(key, value); }
  };
  return { storage, setFail: (value: boolean) => { fail = value; } };
}

afterEach(() => vi.useRealTimers());

describe('amizades e DMs persistentes', () => {
  it('restaura pedidos direcionais e somente o destinatário pode aceitá-los', async () => {
    const { storage } = adapter();
    const before = new InMemoryFriendshipService(storage);
    await before.sendFriendRequest('alice', 'bob');
    const after = new InMemoryFriendshipService(storage);
    expect(await after.getFriends('alice', true)).toEqual([{ friendId: 'bob', status: 'pending', direction: 'outgoing' }]);
    expect(await after.getFriends('bob', true)).toEqual([{ friendId: 'alice', status: 'pending', direction: 'incoming' }]);
    await expect(after.acceptFriendRequest('alice', 'bob')).rejects.toThrow(/APENAS_DESTINATARIO/);
    await after.acceptFriendRequest('bob', 'alice');
    expect(await new InMemoryFriendshipService(storage).getFriends('alice')).toEqual([{ friendId: 'bob', status: 'accepted' }]);
  });

  it('restaura a mesma DM com histórico e mantém isolamento de terceiros', async () => {
    const { storage } = adapter();
    const before = new InMemoryFriendshipService(storage);
    await before.sendFriendRequest('alice', 'bob');
    await before.acceptFriendRequest('bob', 'alice');
    const dm = await before.getOrCreateDmChannel('alice', 'bob');
    const sent = await before.sendDmMessage({ dmChannelId: dm.id, authorId: 'alice', authorName: 'Alice', content: 'Persistente', nonce: 'n1' });
    const after = new InMemoryFriendshipService(storage);
    expect(await after.getOrCreateDmChannel('bob', 'alice')).toEqual(dm);
    expect(await after.getDmMessages(dm.id, 'bob')).toEqual([sent]);
    await expect(after.getDmMessages(dm.id, 'charlie')).rejects.toThrow(/ACESSO_NEGADO_DM/);
    const duplicate = await after.sendDmMessage({ dmChannelId: dm.id, authorId: 'alice', authorName: 'Alice', content: 'Reenvio', nonce: 'n1' });
    expect(duplicate.id).toBe(sent.id);
  });

  it('mantém bloqueios e revogação de acesso ao reabrir', async () => {
    const { storage } = adapter();
    const before = new InMemoryFriendshipService(storage);
    await before.sendFriendRequest('alice', 'bob');
    await before.acceptFriendRequest('bob', 'alice');
    const dm = await before.getOrCreateDmChannel('alice', 'bob');
    await before.blockUser('alice', 'bob');
    const after = new InMemoryFriendshipService(storage);
    expect(await after.getFriends('bob')).toEqual([]);
    expect(await after.isBlocked('alice', 'bob')).toBe(true);
    await expect(after.getDmMessages(dm.id, 'bob')).rejects.toThrow(/BLOQUEIO_ATIVO/);
  });

  it('falha de persistência não emite atualização nem deixa bloqueio fantasma', async () => {
    const store = adapter();
    const service = new InMemoryFriendshipService(store.storage);
    await service.sendFriendRequest('alice', 'bob');
    await service.acceptFriendRequest('bob', 'alice');
    const dm = await service.getOrCreateDmChannel('alice', 'bob');
    const updated = vi.fn();
    service.onDmUpdated(dm.id, 'alice', updated);
    store.setFail(true);
    await expect(service.blockUser('alice', 'bob')).rejects.toThrow('Disco cheio');
    expect(updated).not.toHaveBeenCalled();
    expect(await service.isBlocked('alice', 'bob')).toBe(false);
    await expect(service.sendDmMessage({ dmChannelId: dm.id, authorId: 'alice', authorName: 'Alice', content: 'Não salvo' })).rejects.toThrow('Disco cheio');
    expect(await service.getDmMessages(dm.id, 'bob')).toEqual([]);
    expect(updated).not.toHaveBeenCalled();
  });

  it('não restaura conteúdo expirado há dez dias', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-01T10:00:00Z'));
    const { storage } = adapter();
    const before = new InMemoryFriendshipService(storage);
    await before.sendFriendRequest('alice', 'bob');
    await before.acceptFriendRequest('bob', 'alice');
    const dm = await before.getOrCreateDmChannel('alice', 'bob');
    await before.sendDmMessage({ dmChannelId: dm.id, authorId: 'alice', authorName: 'Alice', content: 'Expirada' });
    vi.advanceTimersByTime(RETENTION_PERIOD_MS + 1);
    expect(await new InMemoryFriendshipService(storage).getDmMessages(dm.id, 'alice')).toEqual([]);
  });
});
