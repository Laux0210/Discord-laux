import { afterEach, describe, expect, it, vi } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { request as httpRequest, type Server } from 'node:http';
import { createSharedServer } from '../../src/server/shared-server';
import { PermissionFlags } from '../../src/common/permissions';

const directories: string[] = [];
const servers: Server[] = [];
async function launch(dataDir?: string) {
  const dir = dataDir ?? mkdtempSync(join(tmpdir(), 'discord-shared-test-'));
  if (!dataDir) directories.push(dir);
  const server = createSharedServer({ dataDir: dir });
  servers.push(server);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Sem porta de teste');
  const base = `http://127.0.0.1:${address.port}`;
  const request = async (path: string, body?: unknown, token?: string, extraHeaders = {}) => {
    const response = await fetch(base + path, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...extraHeaders },
      body: body === undefined ? undefined : JSON.stringify(body, (_, value) => typeof value === 'bigint' ? { $bigint: value.toString() } : value),
    });
    return { status: response.status, body: await response.json() };
  };
  const register = async (name: string) => {
    const response = await request('/api/auth/register', { email: `${name}@example.test`, password: 'test-password-123', displayName: name });
    expect(response.status).toBe(201);
    return response.body as { token: string; user: { id: string; displayName: string } };
  };
  const rpc = (token: string, service: string, method: string, args: unknown[] = []) => request('/api/rpc', { service, method, args }, token);
  return { server, dir, request, register, rpc };
}

afterEach(async () => {
  for (const server of servers.splice(0)) {
    if (server.listening) await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
  for (const dir of directories.splice(0)) rmSync(dir, { recursive: true, force: true });
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('backend compartilhado local', () => {
  it('mantém contas, sessão e conversa após reiniciar o servidor', async () => {
    const first = await launch();
    const owner = await first.register('dono');
    const send = await first.rpc(owner.token, 'chat', 'sendMessage', [{ channelId: 'chan-general', content: 'Histórico persistente', authorId: 'forjado', authorName: 'Outro' }]);
    expect(send.status).toBe(200);
    expect(send.body.result.authorId).toBe(owner.user.id);
    await new Promise<void>(resolve => first.server.close(() => resolve()));

    const second = await launch(first.dir);
    expect((await second.request('/api/auth/session', undefined, owner.token)).body.user.id).toBe(owner.user.id);
    const history = await second.rpc(owner.token, 'chat', 'getMessages', ['chan-general']);
    expect(history.body.result).toEqual([expect.objectContaining({ content: 'Histórico persistente', authorId: owner.user.id })]);
    const stateText = readFileSync(join(first.dir, 'shared-state.json'), 'utf8');
    expect(stateText).not.toContain('test-password-123');
    expect(stateText).not.toContain(owner.token);
    const login = await second.request('/api/auth/login', { email: 'dono@example.test', password: 'test-password-123' });
    expect(login.status).toBe(200);
    await second.request('/api/auth/logout', {}, login.body.token);
    expect((await second.request('/api/auth/session', undefined, login.body.token)).status).toBe(401);
  });

  it('usa uma comunidade para todos sem permitir forjar ator ou criar cargos como membro comum', async () => {
    const app = await launch();
    const owner = await app.register('owner');
    const member = await app.register('member');
    const guilds = await app.rpc(member.token, 'guild', 'getUserGuilds', [owner.user.id]);
    expect(guilds.body.result).toEqual([expect.objectContaining({ id: 'guild-community', ownerId: owner.user.id })]);
    const denied = await app.rpc(member.token, 'guild', 'createChannel', [{ guildId: 'guild-community', name: 'invasao', type: 'text', actorId: owner.user.id }]);
    expect(denied.status).toBe(403);
    const voice = await app.rpc(owner.token, 'guild', 'createChannel', [{ guildId: 'guild-community', name: 'Sala de voz', type: 'voice' }]);
    expect(voice.status).toBe(200);
    const role = await app.rpc(owner.token, 'guild', 'createRole', [{ guildId: 'guild-community', name: 'Moderador', position: 10, color: '#5865f2', permissions: PermissionFlags.MANAGE_CHANNELS }]);
    expect(role.status).toBe(200);
    expect((await app.rpc(member.token, 'guild', 'createRole', [{ guildId: 'guild-community', name: 'Admin forjado', position: 20, permissions: PermissionFlags.ADMINISTRATOR, actorId: owner.user.id }])).status).toBe(403);
    expect((await app.rpc(owner.token, 'guild', 'assignRole', [{ guildId: 'guild-community', targetUserId: member.user.id, roleId: role.body.result.id }])).status).toBe(200);
    expect((await app.rpc(member.token, 'guild', 'createChannel', [{ guildId: 'guild-community', name: 'moderacao', type: 'text' }])).status).toBe(200);
    expect((await app.rpc(owner.token, 'guild', 'removeRole', [{ guildId: 'guild-community', targetUserId: member.user.id, roleId: role.body.result.id }])).status).toBe(200);
    expect((await app.rpc(member.token, 'guild', 'createChannel', [{ guildId: 'guild-community', name: 'negado', type: 'text' }])).status).toBe(403);
  });

  it('mantém pedidos direcionados e DMs privadas depois de reiniciar', async () => {
    const app = await launch();
    const alice = await app.register('alice');
    const bob = await app.register('bob');
    const third = await app.register('third');
    expect((await app.rpc(alice.token, 'friendship', 'sendFriendRequest', [alice.user.id, bob.user.id])).status).toBe(200);
    expect((await app.rpc(alice.token, 'friendship', 'acceptFriendRequest', [alice.user.id, bob.user.id])).status).toBe(403);
    const incoming = await app.rpc(bob.token, 'friendship', 'getFriends', [bob.user.id]);
    expect(incoming.body.result[0].direction).toBe('incoming');
    expect((await app.rpc(bob.token, 'friendship', 'acceptFriendRequest', [bob.user.id, alice.user.id])).status).toBe(200);
    const dm = await app.rpc(alice.token, 'friendship', 'getOrCreateDmChannel', [alice.user.id, bob.user.id]);
    const dmId = dm.body.result.id;
    expect((await app.rpc(alice.token, 'friendship', 'sendDmMessage', [{ dmChannelId: dmId, content: 'Privado', authorId: bob.user.id, authorName: 'Bob' }])).body.result.authorId).toBe(alice.user.id);
    expect((await app.rpc(third.token, 'friendship', 'getDmMessages', [dmId, alice.user.id])).status).toBe(403);
    await new Promise<void>(resolve => app.server.close(() => resolve()));
    const restarted = await launch(app.dir);
    expect((await restarted.rpc(bob.token, 'friendship', 'getDmMessages', [dmId, bob.user.id])).body.result[0].content).toBe('Privado');
    await restarted.rpc(bob.token, 'friendship', 'blockUser', [bob.user.id, alice.user.id]);
    expect((await restarted.rpc(alice.token, 'friendship', 'getDmMessages', [dmId, alice.user.id])).status).toBe(403);
  });

  it('nega acesso sem sessão, RPC fora da whitelist e origem externa', async () => {
    const app = await launch();
    expect((await app.request('/api/users')).status).toBe(401);
    const owner = await app.register('owner');
    expect((await app.rpc(owner.token, 'guild', 'addMemberDirect', ['guild-community', 'intruso'])).status).toBe(400);
    expect((await app.request('/api/users', undefined, owner.token, { Origin: 'https://evil.example' })).status).toBe(403);
    expect((await app.request('/api/auth/login', { email: 'owner@example.test', password: 'senha-errada' })).status).toBe(401);
    const users = await app.request('/api/users', undefined, owner.token);
    expect(users.body).toEqual([expect.objectContaining({ id: owner.user.id })]);
    expect(JSON.stringify(users.body)).not.toMatch(/password|email|hash|salt/);
  });

  it('nega duas instâncias na mesma pasta e libera o lock ao encerrar', async () => {
    const app = await launch();
    expect(() => createSharedServer({ dataDir: app.dir })).toThrow(/instância/);
    expect(existsSync(join(app.dir, 'shared-state.lock'))).toBe(true);
    await new Promise<void>(resolve => app.server.close(() => resolve()));
    expect(existsSync(join(app.dir, 'shared-state.lock'))).toBe(false);
    const next = await launch(app.dir);
    expect((await next.request('/api/health')).body.ok).toBe(true);
  });

  it('não confirma nem mantém alteração em memória quando a escrita em disco falha', async () => {
    const app = await launch();
    const owner = await app.register('owner');
    const temporary = join(app.dir, 'shared-state.json.tmp');
    mkdirSync(temporary);
    const failed = await app.rpc(owner.token, 'chat', 'sendMessage', [{ channelId: 'chan-general', content: 'Não foi gravada' }]);
    expect(failed.status).toBe(503);
    expect(failed.body.error).toBe('Falha ao armazenar os dados. Tente novamente.');
    rmSync(temporary, { recursive: true });
    expect((await app.rpc(owner.token, 'chat', 'getMessages', ['chan-general'])).body.result).toEqual([]);
    expect((await app.rpc(owner.token, 'chat', 'sendMessage', [{ channelId: 'chan-general', content: 'Agora gravada' }])).status).toBe(200);
  });

  it('serve somente arquivos públicos do build e sinaliza o backend compartilhado', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'discord-shared-static-test-'));
    directories.push(dir);
    const publicDir = join(dir, 'dist');
    mkdirSync(publicDir);
    writeFileSync(join(publicDir, 'index.html'), '<html><head></head><body>App</body></html>');
    writeFileSync(join(dir, 'secret.txt'), 'não publicar');
    const server = createSharedServer({ dataDir: join(dir, 'data'), staticDir: publicDir });
    servers.push(server);
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Sem porta');
    const base = `http://127.0.0.1:${address.port}`;
    const page = await fetch(base);
    expect(await page.text()).toContain('<meta name="app-backend" content="shared">');
    expect((await fetch(base + '/secret.txt')).status).toBe(404);
    expect((await fetch(base + '/assets/%2e%2e%2f%2e%2e%2fsecret.txt')).status).toBe(404);
  });

  it('rejeita payload excessivo e permissões malformadas sem alterar o servidor', async () => {
    const app = await launch();
    const owner = await app.register('owner');
    const tooLarge = await app.rpc(owner.token, 'chat', 'sendMessage', [{ channelId: 'chan-general', content: 'x'.repeat(70_000) }]);
    expect(tooLarge.status).toBe(413);
    const malformed = await app.rpc(owner.token, 'guild', 'createRole', [{ guildId: 'guild-community', name: 'Inválido', position: 1, permissions: { $bigint: '9'.repeat(200) } }]);
    expect(malformed.status).toBe(400);
    expect((await app.rpc(owner.token, 'guild', 'getGuild', ['other-guild'])).status).toBe(403);
    expect((await app.rpc(owner.token, 'chat', 'getMessages', ['missing-channel'])).status).toBe(403);
  });

  it('nega Host externo mesmo quando Origin corresponde a ele', async () => {
    const app = await launch();
    const address = app.server.address();
    if (!address || typeof address === 'string') throw new Error('Sem porta');
    const status = await new Promise<number | undefined>((resolve, reject) => {
      const request = httpRequest({ host: '127.0.0.1', port: address.port, path: '/api/health', headers: { Host: `evil.example:${address.port}`, Origin: `http://evil.example:${address.port}` } }, response => {
        response.resume();
        response.on('end', () => resolve(response.statusCode));
      });
      request.on('error', reject);
      request.end();
    });
    expect(status).toBe(403);
  });

  it('purga fisicamente canais e DMs após onze dias ao entrar novamente, preservando contas e cargos', async () => {
    const clock = vi.spyOn(Date, 'now').mockReturnValue(Date.now());
    const start = Date.now();
    const app = await launch();
    const alice = await app.register('alice');
    const bob = await app.register('bob');
    await app.rpc(alice.token, 'friendship', 'sendFriendRequest', [alice.user.id, bob.user.id]);
    await app.rpc(bob.token, 'friendship', 'acceptFriendRequest', [bob.user.id, alice.user.id]);
    const dm = await app.rpc(alice.token, 'friendship', 'getOrCreateDmChannel', [alice.user.id, bob.user.id]);
    await app.rpc(alice.token, 'friendship', 'sendDmMessage', [{ dmChannelId: dm.body.result.id, content: 'Texto privado expirável' }]);
    await app.rpc(alice.token, 'chat', 'sendMessage', [{ channelId: 'chan-general', content: 'Texto público expirável' }]);
    const role = await app.rpc(alice.token, 'guild', 'createRole', [{ guildId: 'guild-community', name: 'Cargo durável', position: 10, permissions: PermissionFlags.VIEW_CHANNEL }]);
    expect(role.status).toBe(200);
    const file = join(app.dir, 'shared-state.json');
    const before = JSON.parse(readFileSync(file, 'utf8'));
    clock.mockReturnValue(start + 11 * 24 * 60 * 60 * 1000);
    expect((await app.request('/api/auth/session', undefined, alice.token)).status).toBe(401);
    const login = await app.request('/api/auth/login', { email: 'alice@example.test', password: 'test-password-123' });
    expect(login.status).toBe(200);
    expect((await app.rpc(login.body.token, 'chat', 'getMessages', ['chan-general'])).body.result).toEqual([]);
    expect((await app.rpc(login.body.token, 'friendship', 'getDmMessages', [dm.body.result.id, alice.user.id])).body.result).toEqual([]);
    const raw = readFileSync(file, 'utf8');
    expect(raw).not.toContain('Texto privado expirável');
    expect(raw).not.toContain('Texto público expirável');
    const after = JSON.parse(raw);
    expect(after.accounts).toEqual(before.accounts);
    expect(after.data.discord_laux_v1_guild_state).toBe(before.data.discord_laux_v1_guild_state);
    expect((await app.rpc(login.body.token, 'guild', 'getGuildRoles', ['guild-community'])).body.result).toContainEqual(expect.objectContaining({ name: 'Cargo durável' }));
  });

  it('remove mensagens expiradas na limpeza periódica mesmo sem tráfego autenticado', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    const clock = vi.spyOn(Date, 'now').mockReturnValue(Date.now());
    const start = Date.now();
    const app = await launch();
    const owner = await app.register('owner');
    await app.rpc(owner.token, 'chat', 'sendMessage', [{ channelId: 'chan-general', content: 'Expirar durante inatividade' }]);
    clock.mockReturnValue(start + 11 * 24 * 60 * 60 * 1000);
    await vi.advanceTimersByTimeAsync(60 * 60 * 1000);
    expect(readFileSync(join(app.dir, 'shared-state.json'), 'utf8')).not.toContain('Expirar durante inatividade');
    await new Promise<void>(resolve => app.server.close(() => resolve()));
    expect(vi.getTimerCount()).toBe(0);
  });
});
