import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { existsSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { networkInterfaces } from 'node:os';
import { extname, isAbsolute, relative, resolve, sep } from 'node:path';
import type { Channel, User } from '../common/types';
import { ALL_PERMISSIONS, hasPermission, PermissionFlags } from '../common/permissions';
import { InMemoryGuildService } from '../renderer/src/services/guild-service';
import { InMemoryFriendshipService } from '../renderer/src/services/friendship-service';
import { DesktopChatService } from '../renderer/src/services/desktop-chat-service';
import type { StorageAdapter } from '../renderer/src/services/storage-service';
import { SharedStore, type ServerAccount, type ServerState } from './shared-store';

const COMMON_GUILD = 'guild-community';
const MAX_BODY_BYTES = 64 * 1024;
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface SharedServerOptions {
  dataDir?: string;
  staticDir?: string;
  allowedOrigins?: string[];
}

class ApiError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ApiError(400, 'Objeto JSON inválido.');
  return value as Record<string, unknown>;
}

function text(value: unknown, name: string, maxLength = 200): string {
  if (typeof value !== 'string' || !value.trim() || value.length > maxLength) throw new ApiError(400, `${name} inválido.`);
  return value.trim();
}

function optionalText(value: unknown, name: string, maxLength = 200): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  return text(value, name, maxLength);
}

function pagination(value: unknown): { limit?: number; before?: number } | undefined {
  if (value === undefined || value === null) return undefined;
  const input = object(value);
  const result: { limit?: number; before?: number } = {};
  if (input.limit !== undefined) {
    if (!Number.isSafeInteger(input.limit) || Number(input.limit) < 1 || Number(input.limit) > 200) throw new ApiError(400, 'Limite de paginação inválido.');
    result.limit = Number(input.limit);
  }
  if (input.before !== undefined) {
    if (!Number.isSafeInteger(input.before) || Number(input.before) < 0) throw new ApiError(400, 'Cursor inválido.');
    result.before = Number(input.before);
  }
  return result;
}

export function stringifyTransport(value: unknown): string {
  return JSON.stringify(value, (_key, item) => typeof item === 'bigint' ? { $bigint: item.toString() } : item);
}

function parseTransport(raw: string): unknown {
  return JSON.parse(raw, (_key, item: unknown) => {
    if (item && typeof item === 'object' && !Array.isArray(item) && Object.keys(item).length === 1 && '$bigint' in item) {
      const digits = (item as { $bigint: unknown }).$bigint;
      if (typeof digits !== 'string' || !/^\d{1,20}$/.test(digits)) throw new ApiError(400, 'Permissões inválidas.');
      const value = BigInt(digits);
      if (value > (1n << 64n) - 1n) throw new ApiError(400, 'Permissões fora do limite.');
      return value;
    }
    return item;
  });
}

async function readBody(request: IncomingMessage): Promise<Record<string, unknown>> {
  if (!request.headers['content-type']?.toLowerCase().startsWith('application/json')) throw new ApiError(415, 'Envie JSON.');
  if (Number(request.headers['content-length'] ?? 0) > MAX_BODY_BYTES) { request.resume(); throw new ApiError(413, 'Corpo da requisição excede 64 KiB.'); }
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.byteLength;
    if (size > MAX_BODY_BYTES) throw new ApiError(413, 'Corpo da requisição excede 64 KiB.');
    chunks.push(buffer);
  }
  try { return object(parseTransport(Buffer.concat(chunks).toString('utf8'))); }
  catch (error) { if (error instanceof ApiError) throw error; throw new ApiError(400, 'JSON inválido.'); }
}

function json(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(stringifyTransport(body));
}

function tokenDigest(token: string): string { return createHash('sha256').update(token).digest('hex'); }

function sessionToken(request: IncomingMessage): string {
  const match = request.headers.authorization?.match(/^Bearer ([A-Za-z0-9_-]{43})$/);
  if (!match) throw new ApiError(401, 'Entre na sua conta para continuar.');
  return match[1];
}

function userForSession(state: ServerState, request: IncomingMessage): User {
  const entry = state.sessions[tokenDigest(sessionToken(request))];
  if (!entry || entry.expiresAt <= Date.now()) throw new ApiError(401, 'Sessão expirada. Entre novamente.');
  const account = Object.values(state.accounts).find(item => item.user.id === entry.userId);
  if (!account) throw new ApiError(401, 'Sessão inválida.');
  return account.user;
}

function createSession(state: ServerState, user: User): { token: string; user: User } {
  for (const [digest, session] of Object.entries(state.sessions)) {
    if (session.expiresAt <= Date.now()) delete state.sessions[digest];
  }
  // Limit the retained active sessions per account.
  const active = Object.entries(state.sessions).filter(([, session]) => session.userId === user.id);
  for (const [digest] of active.slice(0, Math.max(0, active.length - 9))) delete state.sessions[digest];
  const token = randomBytes(32).toString('base64url');
  state.sessions[tokenDigest(token)] = { userId: user.id, expiresAt: Date.now() + SESSION_TTL_MS };
  return { token, user };
}

function accountInput(input: Record<string, unknown>) {
  const email = text(input.email, 'E-mail', 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ApiError(400, 'E-mail inválido.');
  if (typeof input.password !== 'string' || input.password.length < 8 || input.password.length > 128) throw new ApiError(400, 'A senha deve ter entre 8 e 128 caracteres.');
  return { email, password: input.password };
}

function requireKnownUser(state: ServerState, userId: string): void {
  if (!Object.values(state.accounts).some(account => account.user.id === userId)) throw new ApiError(400, 'Usuário não encontrado.');
}

async function handleRpc(state: ServerState, adapter: StorageAdapter, user: User, input: Record<string, unknown>): Promise<unknown> {
  const service = text(input.service, 'Serviço', 20);
  const method = text(input.method, 'Método', 60);
  if (!Array.isArray(input.args) || input.args.length > 8) throw new ApiError(400, 'Argumentos inválidos.');
  const args: unknown[] = input.args;
  const guild = new InMemoryGuildService(adapter);
  const chat = new DesktopChatService(undefined, adapter);
  const friendship = new InMemoryFriendshipService(adapter);

  const requireGuild = async (guildId: unknown): Promise<string> => {
    const id = text(guildId, 'Servidor');
    const member = (await guild.getGuildMembers(id)).some(item => item.userId === user.id);
    if (id !== COMMON_GUILD || !member) throw new ApiError(403, 'Você não é membro deste servidor.');
    return id;
  };
  const requireChannel = async (channelId: unknown, flag = PermissionFlags.VIEW_CHANNEL): Promise<Channel> => {
    await requireGuild(COMMON_GUILD);
    const id = text(channelId, 'Canal');
    const channels = await guild.getGuildChannels(COMMON_GUILD, user.id);
    const channel = channels.find(item => item.id === id);
    if (!channel) throw new ApiError(403, 'Canal inexistente ou sem acesso.');
    const permissions = await guild.getMemberPermissions(COMMON_GUILD, user.id, id);
    if (!hasPermission(permissions, flag)) throw new ApiError(403, 'Permissão insuficiente para este canal.');
    return channel;
  };
  const pairTarget = (index = 1): string => {
    const target = text(args[index], 'Usuário');
    requireKnownUser(state, target);
    return target;
  };

  if (service === 'guild') {
    switch (method) {
      case 'ensureCommonGuild': return guild.ensureCommonGuild(user.id, state.ownerId ?? user.id);
      case 'getUserGuilds': return guild.getUserGuilds(user.id);
      case 'getGuild': return guild.getGuild(await requireGuild(args[0]));
      case 'getGuildMembers': return guild.getGuildMembers(await requireGuild(args[0]));
      case 'getGuildChannels': return guild.getGuildChannels(await requireGuild(args[0]), user.id);
      case 'getGuildRoles': return guild.getGuildRoles(await requireGuild(args[0]));
      case 'getMemberPermissions': {
        const id = await requireGuild(args[0]);
        const channelId = args[2] === undefined ? undefined : text(args[2], 'Canal');
        if (channelId) await requireChannel(channelId);
        return guild.getMemberPermissions(id, user.id, channelId);
      }
      case 'createChannel': {
        const params = object(args[0]);
        const guildId = await requireGuild(params.guildId);
        if (params.type !== 'text' && params.type !== 'voice') throw new ApiError(400, 'Tipo de canal inválido.');
        return guild.createChannel({ guildId, actorId: user.id, name: text(params.name, 'Nome do canal', 100), type: params.type, topic: optionalText(params.topic, 'Assunto', 1024) });
      }
      case 'deleteChannel': {
        const channel = await requireChannel(args[0], PermissionFlags.MANAGE_CHANNELS);
        if (channel.id === 'chan-general') throw new ApiError(400, 'O canal geral do servidor é permanente.');
        return guild.deleteChannel(channel.id, user.id);
      }
      case 'createRole': {
        const params = object(args[0]);
        const guildId = await requireGuild(params.guildId);
        if (typeof params.permissions !== 'bigint' || params.permissions < 0n || (params.permissions & ~ALL_PERMISSIONS) !== 0n) throw new ApiError(400, 'Permissões de cargo inválidas.');
        if (!Number.isSafeInteger(params.position) || Number(params.position) < 1 || Number(params.position) > 1000) throw new ApiError(400, 'Posição de cargo inválida.');
        const permissions = await guild.getMemberPermissions(guildId, user.id);
        if (!hasPermission(permissions, PermissionFlags.MANAGE_ROLES)) throw new ApiError(403, 'Permissão insuficiente para gerenciar cargos.');
        if ((params.permissions & ~permissions) !== 0n) throw new ApiError(403, 'Você não pode conceder permissões que não possui.');
        const color = optionalText(params.color, 'Cor', 7);
        if (color && !/^#[\da-f]{6}$/i.test(color)) throw new ApiError(400, 'Cor inválida.');
        return guild.createRole({ guildId, actorId: user.id, name: text(params.name, 'Nome do cargo', 100), position: Number(params.position), permissions: params.permissions, color });
      }
      case 'assignRole':
      case 'removeRole': {
        const params = object(args[0]);
        const guildId = await requireGuild(params.guildId);
        const targetUserId = text(params.targetUserId, 'Membro');
        requireKnownUser(state, targetUserId);
        const roleId = text(params.roleId, 'Cargo');
        if (roleId === guildId) throw new ApiError(400, 'O cargo @everyone é permanente.');
        const options = { guildId, targetUserId, roleId, actorId: user.id };
        return method === 'assignRole' ? guild.assignRole(options) : guild.removeRole(options);
      }
      default: throw new ApiError(400, 'Método de servidor não permitido.');
    }
  }

  if (service === 'chat') {
    switch (method) {
      case 'getMessages': {
        const channel = await requireChannel(args[0]);
        return chat.getMessages(channel.id, pagination(args[1]));
      }
      case 'sendMessage': {
        const params = object(args[0]);
        const channel = await requireChannel(params.channelId, PermissionFlags.SEND_MESSAGES);
        if (channel.type === 'voice') throw new ApiError(400, 'Escolha um canal de texto para enviar mensagens.');
        return chat.sendMessage({ channelId: channel.id, authorId: user.id, authorName: user.displayName, content: text(params.content, 'Mensagem', 2000), nonce: optionalText(params.nonce, 'Identificador', 200) });
      }
      case 'deleteMessage': {
        const params = object(args[0]);
        const messageId = text(params.messageId, 'Mensagem');
        // Resolve visibility and permissions server-side, never trust client permission bits.
        for (const channel of await guild.getGuildChannels(COMMON_GUILD, user.id)) {
          const messages = await chat.getMessages(channel.id, { limit: 1_000_000 });
          if (!messages.some(message => message.id === messageId)) continue;
          const permissions = await guild.getMemberPermissions(COMMON_GUILD, user.id, channel.id);
          return chat.deleteMessage({ messageId, requesterId: user.id, permissions });
        }
        return false;
      }
      default: throw new ApiError(400, 'Método de conversa não permitido.');
    }
  }

  if (service === 'friendship') {
    switch (method) {
      case 'getFriends': return friendship.getFriends(user.id, true);
      case 'sendFriendRequest': return friendship.sendFriendRequest(user.id, pairTarget());
      case 'acceptFriendRequest': {
        const target = pairTarget();
        const entry = (await friendship.getFriends(user.id, true)).find(item => item.friendId === target);
        if (!entry || (entry.status === 'pending' && entry.direction !== 'incoming')) throw new ApiError(403, 'Somente o destinatário pode aceitar o pedido.');
        return friendship.acceptFriendRequest(user.id, target);
      }
      case 'removeFriendship': return friendship.removeFriendship(user.id, pairTarget());
      case 'blockUser': return friendship.blockUser(user.id, pairTarget());
      case 'unblockUser': return friendship.unblockUser(user.id, pairTarget());
      case 'isBlocked': return friendship.isBlocked(user.id, pairTarget());
      case 'getOrCreateDmChannel': return friendship.getOrCreateDmChannel(user.id, pairTarget());
      case 'getDmChannel': return friendship.getDmChannel(text(args[0], 'Conversa'), user.id);
      case 'getUserDms': return friendship.getUserDms(user.id);
      case 'getDmMessages': return friendship.getDmMessages(text(args[0], 'Conversa'), user.id, pagination(args[2]));
      case 'sendDmMessage': {
        const params = object(args[0]);
        return friendship.sendDmMessage({ dmChannelId: text(params.dmChannelId, 'Conversa'), authorId: user.id, authorName: user.displayName, content: text(params.content, 'Mensagem', 2000), nonce: optionalText(params.nonce, 'Identificador', 200) });
      }
      default: throw new ApiError(400, 'Método de amizade não permitido.');
    }
  }
  throw new ApiError(400, 'Serviço não permitido.');
}

function errorStatus(error: unknown): number {
  if (error instanceof ApiError) return error.status;
  if (error instanceof Error && ('code' in error || /ARMAZENAMENTO_INVALIDO/.test(error.message))) return 503;
  if (error instanceof Error && /permiss|hierarquia|ACESSO_NEGADO|BLOQUEIO_ATIVO|AMIZADE_NECESSARIA|destinat|não é membro|nao e membro/i.test(error.message)) return 403;
  return 400;
}

/** Local single-process server. Exposing it publicly requires TLS and operational review. */
export function createSharedServer(options: SharedServerOptions = {}) {
  const store = new SharedStore(options.dataDir ?? resolve('.local-data'));
  const staticDir = resolve(options.staticDir ?? 'dist');
  const allowedOrigins = new Set(options.allowedOrigins ?? ['http://localhost:5173', 'http://127.0.0.1:5173']);
  const authAttempts = new Map<string, { startedAt: number; count: number }>();
  // Reject DNS rebinding: same-origin alone is insufficient on loopback servers.
  const allowedHosts = new Set(['localhost', '127.0.0.1', '[::1]']);
  for (const entries of Object.values(networkInterfaces())) for (const entry of entries ?? []) allowedHosts.add(entry.family === 'IPv6' ? `[${entry.address}]` : entry.address);

  const server = createServer((request, response) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'same-origin');
    response.setHeader('X-Frame-Options', 'DENY');
    void (async () => {
      const origin = request.headers.origin;
      const host = request.headers.host;
      let hostname: string;
      try { hostname = new URL(`http://${host ?? ''}`).hostname.toLowerCase(); } catch { throw new ApiError(403, 'Host não permitido.'); }
      if (!allowedHosts.has(hostname)) throw new ApiError(403, 'Host não permitido.');
      if (origin && origin !== `http://${host}` && origin !== `https://${host}` && !allowedOrigins.has(origin)) throw new ApiError(403, 'Origem não permitida.');
      // CORS is restricted to the explicitly allowed development origins.
      if (origin && allowedOrigins.has(origin)) {
        response.setHeader('Access-Control-Allow-Origin', origin);
        response.setHeader('Vary', 'Origin');
        response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      }
      if (request.method === 'OPTIONS') { response.writeHead(204); response.end(); return; }
      const url = new URL(request.url ?? '/', 'http://localhost');
      if (url.pathname === '/api/health' && request.method === 'GET') { json(response, 200, { ok: true, mode: 'shared' }); return; }

      if (request.method === 'POST' && (url.pathname === '/api/auth/register' || url.pathname === '/api/auth/login')) {
        const ip = request.socket.remoteAddress ?? 'unknown';
        const now = Date.now();
        if (authAttempts.size > 4096) {
          for (const [key, attempt] of authAttempts) if (now - attempt.startedAt > 60_000) authAttempts.delete(key);
          if (authAttempts.size > 4096) throw new ApiError(429, 'Muitas tentativas. Aguarde um minuto.');
        }
        const attempt = authAttempts.get(ip);
        const currentAttempt = !attempt || now - attempt.startedAt > 60_000 ? { startedAt: now, count: 0 } : attempt;
        currentAttempt.count += 1;
        authAttempts.set(ip, currentAttempt);
        if (currentAttempt.count > 30) throw new ApiError(429, 'Muitas tentativas. Aguarde um minuto.');
        const body = await readBody(request);
        const input = accountInput(body);
        const registering = url.pathname.endsWith('/register');
        const result = await store.transaction(async (state, adapter) => {
          let account: ServerAccount;
          if (registering) {
            if (Object.hasOwn(state.accounts, input.email)) throw new ApiError(409, 'E-mail já cadastrado.');
            const displayName = text(body.displayName ?? input.email.split('@')[0], 'Nome', 80);
            const salt = randomBytes(16).toString('hex');
            const user: User = { id: `user-${randomUUID()}`, username: `membro-${randomBytes(5).toString('hex')}`, displayName, avatarUrl: '' };
            account = { email: input.email, user, salt, passwordHash: scryptSync(input.password, salt, 32).toString('hex') };
            state.accounts[input.email] = account;
            if (!state.ownerId) state.ownerId = user.id;
          } else {
            const found = Object.hasOwn(state.accounts, input.email) ? state.accounts[input.email] : undefined;
            const supplied = scryptSync(input.password, found?.salt ?? 'unregistered-account-dummy-salt', 32);
            if (!found || !timingSafeEqual(supplied, Buffer.from(found.passwordHash, 'hex'))) throw new ApiError(401, 'E-mail ou senha incorretos.');
            account = found;
          }
          await new InMemoryGuildService(adapter).ensureCommonGuild(account.user.id, state.ownerId ?? account.user.id);
          return createSession(state, account.user);
        });
        json(response, registering ? 201 : 200, result);
        return;
      }

      if (url.pathname === '/api/auth/session' && request.method === 'GET') {
        const user = await store.transaction(state => userForSession(state, request));
        json(response, 200, { user }); return;
      }
      if (url.pathname === '/api/auth/logout' && request.method === 'POST') {
        await store.transaction(state => { userForSession(state, request); delete state.sessions[tokenDigest(sessionToken(request))]; });
        json(response, 200, { ok: true }); return;
      }
      if (url.pathname === '/api/users' && request.method === 'GET') {
        const users = await store.transaction(state => { userForSession(state, request); return Object.values(state.accounts).map(account => account.user); });
        json(response, 200, users); return;
      }
      if (url.pathname === '/api/rpc' && request.method === 'POST') {
        const body = await readBody(request);
        const result = await store.transaction((state, adapter) => handleRpc(state, adapter, userForSession(state, request), body));
        json(response, 200, { result }); return;
      }
      if (url.pathname.startsWith('/api/')) throw new ApiError(404, 'Rota não encontrada.');

      if (request.method !== 'GET' && request.method !== 'HEAD') throw new ApiError(405, 'Método não permitido.');
      let path: string;
      try { path = decodeURIComponent(url.pathname); } catch { throw new ApiError(400, 'Caminho inválido.'); }
      if (path !== '/' && path !== '/index.html' && !path.startsWith('/assets/')) throw new ApiError(404, 'Arquivo não encontrado.');
      const file = resolve(staticDir, '.' + (path === '/' ? '/index.html' : path));
      const rel = relative(staticDir, file);
      if (rel.startsWith('..' + sep) || rel === '..' || isAbsolute(rel) || !existsSync(file) || !statSync(file).isFile()) throw new ApiError(404, 'Arquivo não encontrado.');
      const realRelative = relative(realpathSync(staticDir), realpathSync(file));
      if (realRelative === '..' || realRelative.startsWith('..' + sep) || isAbsolute(realRelative)) throw new ApiError(403, 'Caminho não permitido.');
      const extension = extname(file);
      const types: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' };
      let content: Buffer | string = readFileSync(file);
      if (extension === '.html') content = content.toString('utf8').replace('<head>', '<head>\n<meta name="app-backend" content="shared">');
      response.writeHead(200, { 'Content-Type': types[extension] ?? 'application/octet-stream', 'Cache-Control': extension === '.html' ? 'no-cache' : 'public, max-age=3600' });
      response.end(request.method === 'HEAD' ? undefined : content);
    })().catch((error: unknown) => {
      if (response.headersSent) { response.end(); return; }
      const status = errorStatus(error);
      const message = error instanceof Error && !('code' in error) ? error.message : 'Falha ao armazenar os dados. Tente novamente.';
      json(response, status, { error: message });
    });
  });
  server.requestTimeout = 15_000;
  server.headersTimeout = 10_000;
  const retentionTimer = setInterval(() => {
    if (!server.listening) return;
    void store.transaction(() => undefined).catch(() => {
      console.error('Não foi possível concluir a limpeza periódica das mensagens; arquivo preservado.');
    });
  }, 60 * 60 * 1000);
  retentionTimer.unref();
  const closeStore = () => { clearInterval(retentionTimer); store.close(); };
  server.on('close', closeStore);
  server.on('error', () => { if (!server.listening) closeStore(); });
  return server;
}
