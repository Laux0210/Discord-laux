import type { Channel, Guild, GuildMember, Message, Role, User } from '../../../common/types';
import type {
  AssignRoleParams,
  CreateChannelParams,
  CreateGuildParams,
  CreateInviteParams,
  CreateRoleParams,
  GuildService,
  InviteInfo,
} from '../../../common/guild-types';
import type {
  Block,
  DmChannel,
  DmMessage,
  Friendship,
  FriendshipService,
  FriendshipStatus,
  PaginationParams,
  SendDmParams,
} from '../../../common/text-types';
import { ALL_PERMISSIONS } from '../../../common/permissions';
import type { AuthService, ChatService, DeleteMessageParams, SendMessageParams } from './types';
import { MockMediaService } from './mock-media';
import { SupabaseCallController } from './supabase-voice';
import { InMemoryPresenceService } from './presence-service';

export const SINGLE_GUILD_ID = '00000000-0000-0000-0000-000000000001';
const SUPABASE_TOKEN_KEY = 'discord_laux_supabase_session_v1';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  fetcher?: typeof fetch;
}

/** Textos para os `error_code` do Supabase Auth (GoTrue) mais comuns no login e cadastro. */
const AUTH_ERROR_MESSAGES: Record<string, string> = {
  email_not_confirmed: 'Confirme seu e-mail pelo link que enviamos e depois entre.',
  invalid_credentials: 'E-mail ou senha incorretos.',
  user_already_exists: 'Já existe uma conta com este e-mail. Entre em vez de cadastrar.',
  email_exists: 'Já existe uma conta com este e-mail. Entre em vez de cadastrar.',
  weak_password: 'Senha fraca. Use pelo menos 6 caracteres.',
  over_email_send_rate_limit: 'Muitos e-mails enviados. Aguarde alguns minutos e tente de novo.',
  over_request_rate_limit: 'Muitas tentativas. Aguarde um pouco e tente de novo.',
  email_address_invalid: 'E-mail inválido.',
  signup_disabled: 'Novos cadastros estão desativados.',
};

export class SupabaseApiError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
    this.name = 'SupabaseApiError';
  }
}

function containsServiceRoleClaim(key: string): boolean {
  if (/service_role/i.test(key)) {
    return true;
  }
  const parts = key.split('.');
  if (parts.length !== 3) {
    return false;
  }
  try {
    const normalized = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
    const decoded =
      typeof atob === 'function'
        ? atob(padded)
        : Buffer.from(padded, 'base64').toString('utf8');
    return /"role"\s*:\s*"service_role"/i.test(decoded);
  } catch {
    return false;
  }
}

/**
 * Resolve e valida as variáveis de ambiente do Supabase para o renderer.
 * Bloqueia explicitamente chaves service_role no cliente (RF-15).
 */
export function resolveSupabaseConfig(env?: Record<string, string | undefined>): SupabaseConfig | null {
  const source =
    env ??
    ((import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env ?? {});
  const rawUrl = source.VITE_SUPABASE_URL?.trim();
  const rawKey = source.VITE_SUPABASE_ANON_KEY?.trim();

  if (!rawUrl || !rawKey) {
    return null;
  }
  if (containsServiceRoleClaim(rawKey)) {
    throw new Error('Chave service_role proibida no renderer (RF-15). Use apenas VITE_SUPABASE_ANON_KEY.');
  }

  return {
    url: rawUrl.replace(/\/+$/, ''),
    anonKey: rawKey,
  };
}

export class SupabaseRestClient {
  private accessToken: string | null = null;
  private generation = 0;

  constructor(
    private readonly baseUrl: string,
    private readonly anonKey: string,
    private readonly fetcher: typeof fetch = fetch,
  ) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        this.accessToken = window.localStorage.getItem(SUPABASE_TOKEN_KEY);
      }
    } catch {
      /* sessão apenas em memória quando localStorage está bloqueado */
    }
  }

  setAccessToken(token: string | null): void {
    this.accessToken = token;
    this.generation++;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        if (token) window.localStorage.setItem(SUPABASE_TOKEN_KEY, token);
        else window.localStorage.removeItem(SUPABASE_TOKEN_KEY);
      }
    } catch {
      /* ignora falha de escrita de cache de sessão */
    }
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  getGeneration(): number {
    return this.generation;
  }

  private buildHeaders(extra?: Record<string, string>): Record<string, string> {
    const bearer = this.accessToken ?? this.anonKey;
    return {
      apikey: this.anonKey,
      Authorization: `Bearer ${bearer}`,
      ...extra,
    };
  }

  private async requestJson<T>(
    fullUrl: string,
    method: string,
    body?: unknown,
    extraHeaders?: Record<string, string>,
  ): Promise<T> {
    const generation = this.generation;
    const response = await this.fetcher.call(globalThis, fullUrl, {
      method,
      headers: this.buildHeaders({
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...extraHeaders,
      }),
      cache: 'no-store',
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });

    const text = await response.text();
    if (generation !== this.generation) {
      throw new Error('A sessão mudou durante a operação.');
    }

    const parsed = text.length > 0 ? (JSON.parse(text) as unknown) : null;
    if (!response.ok) {
      const errObj = (parsed && typeof parsed === 'object' ? parsed : {}) as {
        message?: string;
        error_description?: string;
        error?: string;
        error_code?: string;
        msg?: string;
      };
      const msg =
        (errObj.error_code && AUTH_ERROR_MESSAGES[errObj.error_code]) ||
        errObj.message ||
        errObj.msg ||
        errObj.error_description ||
        errObj.error ||
        `Erro HTTP ${response.status} no Supabase.`;
      throw new SupabaseApiError(response.status, msg);
    }

    return parsed as T;
  }

  async rest<T>(
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    pathAndQuery: string,
    body?: unknown,
    preferReturn = true,
  ): Promise<T> {
    const normalizedPath = pathAndQuery.startsWith('/') ? pathAndQuery : `/${pathAndQuery}`;
    const extraHeaders =
      method !== 'GET' && preferReturn ? { Prefer: 'return=representation' } : undefined;
    return this.requestJson<T>(
      `${this.baseUrl}/rest/v1${normalizedPath}`,
      method,
      body,
      extraHeaders,
    );
  }

  async rpc<T>(fnName: string, args: Record<string, unknown> = {}): Promise<T> {
    return this.requestJson<T>(`${this.baseUrl}/rest/v1/rpc/${fnName}`, 'POST', args);
  }

  async auth<T>(
    method: 'GET' | 'POST',
    pathAndQuery: string,
    body?: unknown,
  ): Promise<T> {
    const normalizedPath = pathAndQuery.startsWith('/') ? pathAndQuery : `/${pathAndQuery}`;
    return this.requestJson<T>(`${this.baseUrl}/auth/v1${normalizedPath}`, method, body);
  }
}

interface ProfileRow {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string | null;
}

function mapProfileToUser(row: ProfileRow): User {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    ...(row.avatar_url ? { avatarUrl: row.avatar_url } : {}),
  };
}

class SupabaseAuthService implements AuthService {
  private user: User | null = null;
  private listeners = new Set<(user: User | null) => void>();

  constructor(private readonly client: SupabaseRestClient) {}

  getCurrentUser(): User | null {
    return this.user;
  }

  onAuthStateChanged(callback: (user: User | null) => void): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private update(user: User | null): void {
    this.user = user;
    for (const cb of this.listeners) cb(user);
  }

  private async fetchOrBuildUser(userId: string, email?: string, displayName?: string): Promise<User> {
    const rows = await this.client.rest<ProfileRow[]>(
      'GET',
      `/profiles?id=eq.${encodeURIComponent(userId)}&select=id,username,display_name,avatar_url`,
    );
    if (rows && rows.length > 0) {
      return mapProfileToUser(rows[0]);
    }
    const fallbackUsername = (email?.split('@')[0] || 'user').toLowerCase();
    return {
      id: userId,
      username: fallbackUsername,
      displayName: displayName || fallbackUsername,
    };
  }

  async restoreSession(): Promise<void> {
    if (!this.client.getAccessToken()) {
      this.update(null);
      return;
    }
    try {
      const authUser = await this.client.auth<{ id: string; email?: string }>('GET', '/user');
      const profile = await this.fetchOrBuildUser(authUser.id, authUser.email);
      this.update(profile);
    } catch {
      this.update(null);
    }
  }

  async login(): Promise<never> {
    throw new Error('No modo Supabase, entre com e-mail e senha.');
  }

  async loginWithGoogle(): Promise<never> {
    throw new Error('Use e-mail e senha para autenticar neste ambiente.');
  }

  async loginWithCredentials(
    email: string,
    password: string,
    isSignUp = false,
    displayName?: string,
  ): Promise<User> {
    const authRes = await this.client.auth<{
      access_token?: string;
      session?: { access_token?: string };
      user?: { id: string; email?: string };
      id?: string;
    }>(
      'POST',
      isSignUp ? '/signup' : '/token?grant_type=password',
      isSignUp
        ? { email, password, data: { display_name: displayName } }
        : { email, password },
    );

    const token = authRes.access_token ?? authRes.session?.access_token ?? null;
    const userId = authRes.user?.id ?? authRes.id;
    if (!token || !userId) {
      throw new Error('Sessão não retornada pelo Supabase Auth (verifique confirmação de e-mail).');
    }

    this.client.setAccessToken(token);
    const user = await this.fetchOrBuildUser(userId, email, displayName);
    this.update(user);
    return user;
  }

  async logout(): Promise<void> {
    try {
      await this.client.auth('POST', '/logout', {});
    } finally {
      this.client.setAccessToken(null);
      this.update(null);
    }
  }
}

interface GuildRow {
  id: string;
  name: string;
  owner_id: string | null;
  icon_url?: string | null;
}

interface RoleRow {
  id: string;
  guild_id: string;
  name: string;
  position: number;
  permissions: string | number;
  color?: string | null;
}

interface ChannelRow {
  id: string;
  guild_id: string;
  name: string;
  type: 'text' | 'voice';
  topic?: string | null;
  position?: number;
}

function parseSqlPermissions(value: string | number | bigint): bigint {
  if (typeof value === 'bigint') {
    return value < 0n ? ALL_PERMISSIONS : value;
  }
  const big = BigInt(String(value));
  return big < 0n ? ALL_PERMISSIONS : big;
}

function createSupabaseGuildService(client: SupabaseRestClient): GuildService {
  return {
    createGuild: async (_params: CreateGuildParams) => {
      throw new Error('Este app utiliza um único servidor compartilhado.');
    },
    ensureCommonGuild: async (userId: string): Promise<Guild> => {
      const rows = await client.rest<GuildRow[]>(
        'GET',
        `/guilds?id=eq.${SINGLE_GUILD_ID}&select=id,name,owner_id,icon_url`,
      );
      if (!rows || rows.length === 0) {
        return { id: SINGLE_GUILD_ID, name: 'Discord Laux', ownerId: userId };
      }
      const g = rows[0];
      return {
        id: g.id,
        name: g.name,
        ownerId: g.owner_id ?? userId,
        ...(g.icon_url ? { iconUrl: g.icon_url } : {}),
      };
    },
    getGuild: async (guildId: string): Promise<Guild | null> => {
      const rows = await client.rest<GuildRow[]>(
        'GET',
        `/guilds?id=eq.${encodeURIComponent(guildId)}&select=id,name,owner_id,icon_url`,
      );
      if (!rows || rows.length === 0) return null;
      const g = rows[0];
      return {
        id: g.id,
        name: g.name,
        ownerId: g.owner_id ?? '',
        ...(g.icon_url ? { iconUrl: g.icon_url } : {}),
      };
    },
    getUserGuilds: async (_userId: string): Promise<Guild[]> => {
      const rows = await client.rest<GuildRow[]>(
        'GET',
        `/guilds?select=id,name,owner_id,icon_url`,
      );
      return (rows ?? []).map((g) => ({
        id: g.id,
        name: g.name,
        ownerId: g.owner_id ?? '',
        ...(g.icon_url ? { iconUrl: g.icon_url } : {}),
      }));
    },
    getGuildMembers: async (guildId: string): Promise<GuildMember[]> => {
      const [members, memberRoles] = await Promise.all([
        client.rest<{ guild_id: string; user_id: string; nickname?: string | null }[]>(
          'GET',
          `/guild_members?guild_id=eq.${encodeURIComponent(guildId)}&select=guild_id,user_id,nickname`,
        ),
        client.rest<{ guild_id: string; user_id: string; role_id: string }[]>(
          'GET',
          `/member_roles?guild_id=eq.${encodeURIComponent(guildId)}&select=guild_id,user_id,role_id`,
        ),
      ]);
      const rolesByUser = new Map<string, string[]>();
      for (const mr of memberRoles ?? []) {
        const list = rolesByUser.get(mr.user_id) ?? [];
        list.push(mr.role_id);
        rolesByUser.set(mr.user_id, list);
      }
      return (members ?? []).map((m) => ({
        guildId: m.guild_id,
        userId: m.user_id,
        ...(m.nickname ? { nickname: m.nickname } : {}),
        roleIds: rolesByUser.get(m.user_id) ?? [],
      }));
    },
    getGuildChannels: async (guildId: string, _actorId: string): Promise<Channel[]> => {
      const rows = await client.rest<ChannelRow[]>(
        'GET',
        `/channels?guild_id=eq.${encodeURIComponent(guildId)}&order=position.asc,created_at.asc&select=id,guild_id,name,type,topic,position`,
      );
      return (rows ?? []).map((c) => ({
        id: c.id,
        guildId: c.guild_id,
        name: c.name,
        type: c.type,
        ...(c.topic ? { topic: c.topic } : {}),
        ...(typeof c.position === 'number' ? { position: c.position } : {}),
      }));
    },
    getGuildRoles: async (guildId: string): Promise<Role[]> => {
      const rows = await client.rest<RoleRow[]>(
        'GET',
        `/roles?guild_id=eq.${encodeURIComponent(guildId)}&order=position.desc&select=id,guild_id,name,position,permissions,color`,
      );
      return (rows ?? []).map((r) => ({
        id: r.id,
        name: r.name,
        position: r.position,
        permissions: parseSqlPermissions(r.permissions),
        ...(r.color ? { color: r.color } : {}),
      }));
    },
    getMemberPermissions: async (guildId: string, userId: string): Promise<bigint> => {
      const raw = await client.rpc<string | number>('member_permissions', {
        gid: guildId,
        uid: userId,
      });
      return parseSqlPermissions(raw);
    },
    createChannel: async (params: CreateChannelParams): Promise<Channel> => {
      const rows = await client.rest<ChannelRow[]>('POST', '/channels', {
        guild_id: params.guildId,
        name: params.name.trim(),
        type: params.type,
        ...(params.topic ? { topic: params.topic } : {}),
      });
      const c = rows[0];
      return {
        id: c.id,
        guildId: c.guild_id,
        name: c.name,
        type: c.type,
        ...(c.topic ? { topic: c.topic } : {}),
      };
    },
    deleteChannel: async (channelId: string, _actorId: string): Promise<boolean> => {
      await client.rest('DELETE', `/channels?id=eq.${encodeURIComponent(channelId)}`, undefined, false);
      return true;
    },
    createRole: async (params: CreateRoleParams): Promise<Role> => {
      const rows = await client.rest<RoleRow[]>('POST', '/roles', {
        guild_id: params.guildId,
        name: params.name.trim(),
        position: params.position,
        permissions: params.permissions.toString(),
        ...(params.color ? { color: params.color } : {}),
      });
      const r = rows[0];
      return {
        id: r.id,
        name: r.name,
        position: r.position,
        permissions: parseSqlPermissions(r.permissions),
        ...(r.color ? { color: r.color } : {}),
      };
    },
    assignRole: async (params: AssignRoleParams): Promise<boolean> => {
      await client.rest('POST', '/member_roles', {
        guild_id: params.guildId,
        user_id: params.targetUserId,
        role_id: params.roleId,
      });
      return true;
    },
    removeRole: async (params: AssignRoleParams): Promise<boolean> => {
      await client.rest(
        'DELETE',
        `/member_roles?guild_id=eq.${encodeURIComponent(params.guildId)}&user_id=eq.${encodeURIComponent(params.targetUserId)}&role_id=eq.${encodeURIComponent(params.roleId)}`,
        undefined,
        false,
      );
      return true;
    },
    createInvite: async (_params: CreateInviteParams): Promise<InviteInfo> => {
      throw new Error('Todos os cadastrados entram automaticamente no servidor único.');
    },
    getInvite: async () => null,
    joinGuildByInvite: async () => {
      throw new Error('Entre na sua conta para acessar o servidor único.');
    },
  };
}

interface MessageRow {
  id: string;
  channel_id: string;
  author_id: string;
  content: string;
  created_at: string;
  is_deleted: boolean;
  profiles?: { username?: string; display_name?: string } | null;
}

class SupabaseChatService implements ChatService {
  constructor(private readonly client: SupabaseRestClient) {}

  async sendMessage(params: SendMessageParams): Promise<Message> {
    const trimmed = params.content.trim();
    if (!trimmed || trimmed.length > 2000) {
      throw new Error('Mensagem deve ter entre 1 e 2000 caracteres.');
    }
    const rows = await this.client.rest<MessageRow[]>('POST', '/messages', {
      channel_id: params.channelId,
      author_id: params.authorId,
      content: trimmed,
    });
    const m = rows[0];
    return {
      id: m.id,
      channelId: m.channel_id,
      authorId: m.author_id,
      authorName: params.authorName,
      content: m.content,
      createdAt: Date.parse(m.created_at),
      isDeleted: m.is_deleted,
    };
  }

  async getMessages(channelId: string): Promise<Message[]> {
    const rows = await this.client.rest<MessageRow[]>(
      'GET',
      `/messages?channel_id=eq.${encodeURIComponent(channelId)}&is_deleted=eq.false&order=created_at.asc&select=id,channel_id,author_id,content,created_at,is_deleted,profiles(username,display_name)`,
    );
    return (rows ?? []).map((m) => ({
      id: m.id,
      channelId: m.channel_id,
      authorId: m.author_id,
      authorName: m.profiles?.display_name || m.profiles?.username || m.author_id,
      content: m.content,
      createdAt: Date.parse(m.created_at),
      isDeleted: m.is_deleted,
    }));
  }

  async deleteMessage(params: DeleteMessageParams): Promise<boolean> {
    await this.client.rest(
      'PATCH',
      `/messages?id=eq.${encodeURIComponent(params.messageId)}`,
      { is_deleted: true },
    );
    return true;
  }

  onMessagesUpdated(channelId: string, callback: (messages: Message[]) => void): () => void {
    let stopped = false;
    let pending = false;
    let previous = '';
    const generation = this.client.getGeneration();
    const poll = async () => {
      if (stopped || pending || generation !== this.client.getGeneration()) return;
      pending = true;
      try {
        const messages = await this.getMessages(channelId);
        if (stopped || generation !== this.client.getGeneration()) return;
        const next = JSON.stringify(messages);
        if (next !== previous) {
          previous = next;
          callback(messages);
        }
      } catch (error) {
        if (
          !stopped &&
          generation === this.client.getGeneration() &&
          error instanceof SupabaseApiError &&
          [401, 403].includes(error.status)
        ) {
          previous = '[]';
          callback([]);
        }
      } finally {
        pending = false;
      }
    };
    void poll();
    const interval = setInterval(() => {
      void poll();
    }, 1500);
    return () => {
      stopped = true;
      clearInterval(interval);
    };
  }

  onNewMessage(channelId: string, callback: (msg: Message) => void): () => void {
    let stopped = false;
    let pending = false;
    const seen = new Set<string>();
    const generation = this.client.getGeneration();
    const poll = async () => {
      if (stopped || pending || generation !== this.client.getGeneration()) return;
      pending = true;
      try {
        const messages = await this.getMessages(channelId);
        if (stopped || generation !== this.client.getGeneration()) return;
        for (const msg of messages) {
          if (!seen.has(msg.id)) callback(msg);
          seen.add(msg.id);
        }
      } catch {
        /* mantém histórico atual */
      } finally {
        pending = false;
      }
    };
    void poll();
    const interval = setInterval(() => {
      void poll();
    }, 1500);
    return () => {
      stopped = true;
      clearInterval(interval);
    };
  }
}

interface FriendshipRow {
  user_id: string;
  friend_id: string;
  status: FriendshipStatus;
  created_at: string;
}

interface DmMessageRow {
  id: string;
  dm_channel_id: string;
  author_id: string;
  content: string;
  created_at: string;
  is_deleted: boolean;
  profiles?: { username?: string; display_name?: string } | null;
}

function createSupabaseFriendshipService(client: SupabaseRestClient): FriendshipService {
  const resolveTargetId = async (targetIdOrUsername: string): Promise<string> => {
    const trimmed = targetIdOrUsername.trim();
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)) {
      return trimmed;
    }
    const rows = await client.rest<ProfileRow[]>(
      'GET',
      `/profiles?username=eq.${encodeURIComponent(trimmed)}&select=id,username,display_name`,
    );
    if (!rows || rows.length === 0) {
      throw new Error('Usuário não encontrado.');
    }
    return rows[0].id;
  };

  return {
    sendFriendRequest: async (requesterId: string, targetUserId: string): Promise<Friendship> => {
      const resolvedTarget = await resolveTargetId(targetUserId);
      const rows = await client.rest<FriendshipRow[]>('POST', '/friendships', {
        user_id: requesterId,
        friend_id: resolvedTarget,
        status: 'pending',
      });
      const f = rows[0];
      return {
        userId: f.user_id,
        friendId: f.friend_id,
        status: f.status,
        createdAt: Date.parse(f.created_at),
      };
    },
    acceptFriendRequest: async (userId: string, friendId: string): Promise<Friendship> => {
      const rows = await client.rest<FriendshipRow[]>(
        'PATCH',
        `/friendships?user_id=eq.${encodeURIComponent(friendId)}&friend_id=eq.${encodeURIComponent(userId)}`,
        { status: 'accepted' },
      );
      const f = rows[0];
      return {
        userId: f.user_id,
        friendId: f.friend_id,
        status: f.status,
        createdAt: Date.parse(f.created_at),
      };
    },
    removeFriendship: async (userA: string, userB: string): Promise<boolean> => {
      await client.rest(
        'DELETE',
        `/friendships?or=(and(user_id.eq.${encodeURIComponent(userA)},friend_id.eq.${encodeURIComponent(userB)}),and(user_id.eq.${encodeURIComponent(userB)},friend_id.eq.${encodeURIComponent(userA)}))`,
        undefined,
        false,
      );
      return true;
    },
    getFriends: async (
      userId: string,
      includeDirection = false,
    ): Promise<{ friendId: string; status: FriendshipStatus; direction?: 'incoming' | 'outgoing' }[]> => {
      const rows = await client.rest<FriendshipRow[]>(
        'GET',
        `/friendships?or=(user_id.eq.${encodeURIComponent(userId)},friend_id.eq.${encodeURIComponent(userId)})&select=user_id,friend_id,status,created_at`,
      );
      return (rows ?? []).map((f) => {
        const isOutgoing = f.user_id === userId;
        const friendId = isOutgoing ? f.friend_id : f.user_id;
        return {
          friendId,
          status: f.status,
          ...(includeDirection ? { direction: isOutgoing ? 'outgoing' : 'incoming' } : {}),
        };
      });
    },
    blockUser: async (blockerId: string, blockedId: string): Promise<Block> => {
      const rows = await client.rest<{ blocker_id: string; blocked_id: string; created_at: string }[]>(
        'POST',
        '/blocks',
        { blocker_id: blockerId, blocked_id: blockedId },
      );
      const b = rows[0];
      return {
        blockerId: b.blocker_id,
        blockedId: b.blocked_id,
        createdAt: Date.parse(b.created_at),
      };
    },
    unblockUser: async (blockerId: string, blockedId: string): Promise<boolean> => {
      await client.rest(
        'DELETE',
        `/blocks?blocker_id=eq.${encodeURIComponent(blockerId)}&blocked_id=eq.${encodeURIComponent(blockedId)}`,
        undefined,
        false,
      );
      return true;
    },
    isBlocked: async (userA: string, userB: string): Promise<boolean> => {
      const rows = await client.rest<{ blocker_id: string; blocked_id: string }[]>(
        'GET',
        `/blocks?or=(and(blocker_id.eq.${encodeURIComponent(userA)},blocked_id.eq.${encodeURIComponent(userB)}),and(blocker_id.eq.${encodeURIComponent(userB)},blocked_id.eq.${encodeURIComponent(userA)}))&select=blocker_id,blocked_id`,
      );
      return (rows ?? []).length > 0;
    },
    getOrCreateDmChannel: async (userA: string, userB: string): Promise<DmChannel> => {
      const dmId = await client.rpc<string>('open_dm', { other: userB });
      return {
        id: dmId,
        participantIds: [userA, userB],
        createdAt: Date.now(),
      };
    },
    getDmChannel: async (dmChannelId: string, requesterId: string): Promise<DmChannel | null> => {
      const participants = await client.rest<{ dm_channel_id: string; user_id: string }[]>(
        'GET',
        `/dm_participants?dm_channel_id=eq.${encodeURIComponent(dmChannelId)}&select=dm_channel_id,user_id`,
      );
      if (!participants || participants.length < 2) return null;
      if (!participants.some((p) => p.user_id === requesterId)) return null;
      return {
        id: dmChannelId,
        participantIds: [participants[0].user_id, participants[1].user_id],
        createdAt: Date.now(),
      };
    },
    getUserDms: async (userId: string): Promise<DmChannel[]> => {
      const myRows = await client.rest<{ dm_channel_id: string; user_id: string }[]>(
        'GET',
        `/dm_participants?user_id=eq.${encodeURIComponent(userId)}&select=dm_channel_id,user_id`,
      );
      const result: DmChannel[] = [];
      for (const row of myRows ?? []) {
        const ch = await client.rest<{ dm_channel_id: string; user_id: string }[]>(
          'GET',
          `/dm_participants?dm_channel_id=eq.${encodeURIComponent(row.dm_channel_id)}&select=dm_channel_id,user_id`,
        );
        if (ch && ch.length >= 2) {
          result.push({
            id: row.dm_channel_id,
            participantIds: [ch[0].user_id, ch[1].user_id],
            createdAt: Date.now(),
          });
        }
      }
      return result;
    },
    sendDmMessage: async (params: SendDmParams): Promise<DmMessage> => {
      const trimmed = params.content.trim();
      if (!trimmed || trimmed.length > 2000) {
        throw new Error('Mensagem direta deve ter entre 1 e 2000 caracteres.');
      }
      const rows = await client.rest<DmMessageRow[]>('POST', '/dm_messages', {
        dm_channel_id: params.dmChannelId,
        author_id: params.authorId,
        content: trimmed,
      });
      const m = rows[0];
      return {
        id: m.id,
        dmChannelId: m.dm_channel_id,
        authorId: m.author_id,
        authorName: params.authorName,
        content: m.content,
        createdAt: Date.parse(m.created_at),
        isDeleted: m.is_deleted,
      };
    },
    getDmMessages: async (
      dmChannelId: string,
      _requesterId: string,
      _pagination?: PaginationParams,
    ): Promise<DmMessage[]> => {
      const rows = await client.rest<DmMessageRow[]>(
        'GET',
        `/dm_messages?dm_channel_id=eq.${encodeURIComponent(dmChannelId)}&is_deleted=eq.false&order=created_at.asc&select=id,dm_channel_id,author_id,content,created_at,is_deleted,profiles(username,display_name)`,
      );
      return (rows ?? []).map((m) => ({
        id: m.id,
        dmChannelId: m.dm_channel_id,
        authorId: m.author_id,
        authorName: m.profiles?.display_name || m.profiles?.username || m.author_id,
        content: m.content,
        createdAt: Date.parse(m.created_at),
        isDeleted: m.is_deleted,
      }));
    },
    onDmUpdated: (dmChannelId: string, _requesterId: string, callback: () => void) => {
      let stopped = false;
      let pending = false;
      let previous = '';
      const generation = client.getGeneration();
      const poll = async () => {
        if (stopped || pending || generation !== client.getGeneration()) return;
        pending = true;
        try {
          const rows = await client.rest<DmMessageRow[]>(
            'GET',
            `/dm_messages?dm_channel_id=eq.${encodeURIComponent(dmChannelId)}&is_deleted=eq.false&order=created_at.asc&select=id,created_at`,
          );
          if (stopped || generation !== client.getGeneration()) return;
          const next = JSON.stringify(rows);
          if (next !== previous) {
            previous = next;
            callback();
          }
        } catch {
          if (!stopped && generation === client.getGeneration()) callback();
        } finally {
          pending = false;
        }
      };
      void poll();
      const interval = setInterval(() => {
        void poll();
      }, 1500);
      return () => {
        stopped = true;
        clearInterval(interval);
      };
    },
  };
}

export async function createSupabaseAppServices(config: SupabaseConfig) {
  const validated = resolveSupabaseConfig({
    VITE_SUPABASE_URL: config.url,
    VITE_SUPABASE_ANON_KEY: config.anonKey,
  });
  if (!validated) {
    throw new Error('Configuração Supabase ausente (VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY).');
  }

  const client = new SupabaseRestClient(validated.url, validated.anonKey, config.fetcher);
  const authService = new SupabaseAuthService(client);
  await authService.restoreSession();

  return {
    authService,
    chatService: new SupabaseChatService(client),
    guildService: createSupabaseGuildService(client),
    friendshipService: createSupabaseFriendshipService(client),
    mediaService: new MockMediaService(),
    callController: new SupabaseCallController(client, () => authService.getCurrentUser()),
    presenceService: new InMemoryPresenceService(),
    userDirectory: async (): Promise<User[]> => {
      const rows = await client.rest<ProfileRow[]>(
        'GET',
        '/profiles?order=created_at.asc&select=id,username,display_name,avatar_url',
      );
      return (rows ?? []).map(mapProfileToUser);
    },
    sharedBackend: true,
  };
}
