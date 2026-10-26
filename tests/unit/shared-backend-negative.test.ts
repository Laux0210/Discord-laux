import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Server } from 'node:http';
import { createSharedServer, stringifyTransport } from '../../src/server/shared-server';
import { PermissionFlags } from '../../src/common/permissions';

let server: Server | undefined;
let dataDir = '';
async function launch() {
  dataDir = mkdtempSync(join(tmpdir(), 'discord-negative-review-'));
  server = createSharedServer({ dataDir });
  await new Promise<void>(resolve => server!.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Porta ausente');
  const base = `http://127.0.0.1:${address.port}`;
  const request = async (path: string, body?: unknown, token?: string) => {
    const response = await fetch(base + path, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : stringifyTransport(body),
    });
    return { status: response.status, body: await response.json() };
  };
  const register = async (name: string) => {
    const result = await request('/api/auth/register', { email: `${name}@example.test`, password: 'only-test-password', displayName: name });
    expect(result.status).toBe(201);
    return result.body as { token: string; user: { id: string } };
  };
  const rpc = (token: string, service: string, method: string, args: unknown[]) => request('/api/rpc', { service, method, args }, token);
  return { request, register, rpc };
}

afterEach(async () => {
  vi.restoreAllMocks();
  if (server?.listening) await new Promise<void>(resolve => server!.close(() => resolve()));
  if (dataDir) rmSync(dataDir, { recursive: true, force: true });
});

describe('contraprovas sugeridas na revisão do Claude', () => {
  it('nega DM entre não amigos e consulta amizades sempre como a sessão', async () => {
    const app = await launch();
    const alice = await app.register('alice');
    const bob = await app.register('bob');
    const third = await app.register('third');
    expect((await app.rpc(alice.token, 'friendship', 'getOrCreateDmChannel', [alice.user.id, third.user.id])).status).toBe(403);
    await app.rpc(alice.token, 'friendship', 'sendFriendRequest', [alice.user.id, bob.user.id]);
    await app.rpc(third.token, 'friendship', 'sendFriendRequest', [third.user.id, bob.user.id]);
    const attemptedOtherList = await app.rpc(alice.token, 'friendship', 'getFriends', [bob.user.id]);
    expect(attemptedOtherList.status).toBe(200);
    expect(attemptedOtherList.body.result).toHaveLength(1);
    expect(attemptedOtherList.body.result[0].friendId).toBe(bob.user.id);
    expect(JSON.stringify(attemptedOtherList.body.result)).not.toContain(third.user.id);
  });

  it('rejeita conteúdo vazio, longo e envio em canal de voz sem gravar mensagens', async () => {
    const app = await launch();
    const owner = await app.register('owner');
    for (const params of [
      { channelId: 'chan-general', content: '   ' },
      { channelId: 'chan-general', content: 'x'.repeat(2001) },
      { channelId: 'chan-voice-main', content: 'Não é um canal de texto' },
    ]) {
      expect((await app.rpc(owner.token, 'chat', 'sendMessage', [params])).status).toBe(400);
    }
    expect((await app.rpc(owner.token, 'chat', 'getMessages', ['chan-general'])).body.result).toEqual([]);
  });

  it('nega cargo igual ao gerente e concessão de ADMIN inferior ou mutação de @everyone fora da whitelist', async () => {
    const app = await launch();
    const owner = await app.register('owner');
    const manager = await app.register('manager');
    const target = await app.register('target');
    const roleParams = { guildId: 'guild-community', actorId: owner.user.id };
    const managingRole = await app.rpc(owner.token, 'guild', 'createRole', [{ ...roleParams, name: 'Gerente', position: 100, permissions: PermissionFlags.MANAGE_ROLES }]);
    const adminRole = await app.rpc(owner.token, 'guild', 'createRole', [{ ...roleParams, name: 'Admin inferior', position: 10, permissions: PermissionFlags.ADMINISTRATOR }]);
    expect(managingRole.status).toBe(200);
    expect(adminRole.status).toBe(200);
    await app.rpc(owner.token, 'guild', 'assignRole', [{ ...roleParams, targetUserId: manager.user.id, roleId: managingRole.body.result.id }]);
    expect((await app.rpc(manager.token, 'guild', 'createRole', [{ ...roleParams, name: 'Igual', position: 100, permissions: PermissionFlags.VIEW_CHANNEL }])).status).toBe(403);
    expect((await app.rpc(manager.token, 'guild', 'assignRole', [{ ...roleParams, targetUserId: manager.user.id, roleId: adminRole.body.result.id }])).status).toBe(403);
    expect((await app.rpc(manager.token, 'guild', 'assignRole', [{ ...roleParams, targetUserId: target.user.id, roleId: adminRole.body.result.id }])).status).toBe(403);
    const members = await app.rpc(owner.token, 'guild', 'getGuildMembers', ['guild-community']);
    expect(members.body.result.find((member: { userId: string }) => member.userId === target.user.id).roleIds).not.toContain(adminRole.body.result.id);
    expect((await app.rpc(manager.token, 'guild', 'updateRole', [{ ...roleParams, roleId: 'guild-community', permissions: PermissionFlags.ADMINISTRATOR }])).status).toBe(400);
    expect((await app.rpc(manager.token, 'guild', 'createChannel', [{ ...roleParams, name: 'Escalada negada', type: 'text' }])).status).toBe(403);
  });

  it('limita tentativas de autenticação e libera a janela seguinte', async () => {
    const app = await launch();
    const initial = Date.now();
    const clock = vi.spyOn(Date, 'now').mockReturnValue(initial);
    for (let index = 0; index < 30; index++) {
      expect((await app.request('/api/auth/login', { email: 'inválido', password: 'only-test-password' })).status).toBe(400);
    }
    expect((await app.request('/api/auth/login', { email: 'inválido', password: 'only-test-password' })).status).toBe(429);
    clock.mockReturnValue(initial + 60_001);
    expect((await app.request('/api/auth/login', { email: 'inválido', password: 'only-test-password' })).status).toBe(400);
  });
});
