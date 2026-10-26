import { afterEach, describe, expect, it, vi } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SharedStore, type ServerState } from '../../src/server/shared-store';

const RETENTION_MS = 10 * 24 * 60 * 60 * 1000;
const directories: string[] = [];
const stores: SharedStore[] = [];
const chatKey = 'discord_laux_v1_chat_state';
const friendshipKey = 'discord_laux_v1_friendship_state';

function fixture(now: number) {
  const expired = now - RETENTION_MS - 1;
  const fresh = now - 1;
  const message = (id: string, createdAt: number) => ({ id, channelId: 'chan-general', authorId: 'user-1', authorName: 'Um', content: id, createdAt });
  const dm = (id: string, createdAt: number) => ({ id, dmChannelId: 'dm-1', authorId: 'user-1', authorName: 'Um', content: id, createdAt });
  const state: ServerState = {
    version: 1, ownerId: 'user-1', accounts: {}, sessions: {}, data: {
      [chatKey]: JSON.stringify({ version: 1, data: [message('canal-expirado', expired), message('canal-limite', now - RETENTION_MS), message('canal-recente', fresh)], extra: 'preservar' }),
      [friendshipKey]: JSON.stringify({ version: 1, data: { friendships: [['pair', { userId: 'user-1', friendId: 'user-2', status: 'accepted', createdAt: expired }]], blocks: ['user-3:user-4'], dmChannels: [['dm-1', { id: 'dm-1', participantIds: ['user-1', 'user-2'], createdAt: expired }]], dmMessages: [dm('dm-expirado', expired), dm('dm-limite', now - RETENTION_MS), dm('dm-recente', fresh)] } }),
      discord_laux_v1_guild_state: JSON.stringify({ version: 1, data: { roles: [['guild-community', [{ name: 'Admin', permissions: '8' }]]] } }),
      untouched: 'valor arbitrário',
    },
  };
  const dir = mkdtempSync(join(tmpdir(), 'discord-retention-test-'));
  directories.push(dir);
  writeFileSync(join(dir, 'shared-state.json'), JSON.stringify(state));
  return { dir, state };
}

afterEach(() => {
  vi.restoreAllMocks();
  for (const store of stores.splice(0)) store.close();
  for (const dir of directories.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe('purga física do arquivo compartilhado', () => {
  it('remove textos expirados na abertura e preserva os limites distintos de canal e DM', () => {
    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now);
    const { dir, state } = fixture(now);
    const store = new SharedStore(dir);
    stores.push(store);
    const raw = readFileSync(join(dir, 'shared-state.json'), 'utf8');
    const persisted = JSON.parse(raw) as ServerState;
    expect(JSON.parse(persisted.data[chatKey]).data.map((message: { id: string }) => message.id)).toEqual(['canal-limite', 'canal-recente']);
    expect(JSON.parse(persisted.data[friendshipKey]).data.dmMessages.map((message: { id: string }) => message.id)).toEqual(['dm-recente']);
    expect(raw).not.toContain('canal-expirado');
    expect(raw).not.toContain('dm-expirado');
    expect(persisted.data.discord_laux_v1_guild_state).toBe(state.data.discord_laux_v1_guild_state);
    expect(persisted.data.untouched).toBe('valor arbitrário');
    const beforeFriends = JSON.parse(state.data[friendshipKey]).data;
    const afterFriends = JSON.parse(persisted.data[friendshipKey]).data;
    expect(afterFriends.friendships).toEqual(beforeFriends.friendships);
    expect(afterFriends.blocks).toEqual(beforeFriends.blocks);
    expect(afterFriends.dmChannels).toEqual(beforeFriends.dmChannels);
    expect(JSON.parse(persisted.data[chatKey]).extra).toBe('preservar');
  });

  it('remove fisicamente antes de uma transação apenas de leitura e não regrava sem mudança', async () => {
    const start = Date.now();
    const clock = vi.spyOn(Date, 'now').mockReturnValue(start);
    const { dir } = fixture(start);
    const store = new SharedStore(dir);
    stores.push(store);
    clock.mockReturnValue(start + 11 * 24 * 60 * 60 * 1000);
    const result = await store.transaction((_state, adapter) => adapter.getItem(chatKey));
    expect(JSON.parse(result!).data).toEqual([]);
    const raw = readFileSync(join(dir, 'shared-state.json'), 'utf8');
    expect(raw).not.toContain('canal-recente');
    expect(raw).not.toContain('dm-recente');
    // An unusable temporary destination proves that a no-op read does not write.
    mkdirSync(join(dir, 'shared-state.json.tmp'));
    await expect(store.transaction(() => 'leitura')).resolves.toBe('leitura');
  });

  it('não sobrescreve snapshots corrompidos nem deixa lock depois da falha de abertura', () => {
    const { dir, state } = fixture(Date.now());
    state.data[friendshipKey] = JSON.stringify({ version: 1, data: { dmMessages: [{ content: 'timestamp ausente' }] } });
    const before = JSON.stringify(state);
    writeFileSync(join(dir, 'shared-state.json'), before);
    expect(() => new SharedStore(dir)).toThrow(/ARMAZENAMENTO_INVALIDO/);
    expect(readFileSync(join(dir, 'shared-state.json'), 'utf8')).toBe(before);
    expect(existsSync(join(dir, 'shared-state.lock'))).toBe(false);
  });

  it('preserva o arquivo e o estado confirmado se falhar a gravação da purga', async () => {
    const start = Date.now();
    const clock = vi.spyOn(Date, 'now').mockReturnValue(start);
    const { dir } = fixture(start);
    const store = new SharedStore(dir);
    stores.push(store);
    const file = join(dir, 'shared-state.json');
    const before = readFileSync(file, 'utf8');
    mkdirSync(file + '.tmp');
    clock.mockReturnValue(start + 11 * 24 * 60 * 60 * 1000);
    await expect(store.transaction(() => 'não confirmar')).rejects.toBeDefined();
    expect(readFileSync(file, 'utf8')).toBe(before);
    rmSync(file + '.tmp', { recursive: true });
    await store.transaction(() => undefined);
    expect(readFileSync(file, 'utf8')).not.toContain('canal-recente');
  });
});
