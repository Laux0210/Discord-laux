import type { User, Message } from '../../../common/types';
import type { GuildService } from '../../../common/guild-types';
import type { FriendshipService } from '../../../common/text-types';
import type { AuthService, ChatService } from './types';
import { MockMediaService } from './mock-media';
import { DesktopCallController } from './desktop-call-controller';
import { InMemoryPresenceService } from './presence-service';

const TOKEN_KEY = 'discord_laux_shared_session_v1';

export class SharedApiError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}

export function encodeTransport(value: unknown): string {
  return JSON.stringify(value, (_key, item) => typeof item === 'bigint' ? { $bigint: item.toString() } : item);
}

export function decodeTransport(text: string): unknown {
  return JSON.parse(text, (_key, value: unknown) => {
    if (value && typeof value === 'object' && Object.keys(value).length === 1 && '$bigint' in value) {
      const decimal = (value as { $bigint: unknown }).$bigint;
      if (typeof decimal === 'string' && /^\d{1,30}$/.test(decimal)) return BigInt(decimal);
    }
    return value;
  });
}

export class SharedApiClient {
  private token: string | null = null;
  private generation = 0;

  constructor(private baseUrl = '/api', private fetcher: typeof fetch = fetch) {
    try { this.token = window.localStorage.getItem(TOKEN_KEY); } catch { /* sessão apenas nesta aba */ }
  }

  setToken(token: string | null): void {
    this.token = token;
    this.generation++;
    try {
      if (token) window.localStorage.setItem(TOKEN_KEY, token);
      else window.localStorage.removeItem(TOKEN_KEY);
    } catch { /* Não declarar persistência de sessão quando storage está indisponível. */ }
  }

  getGeneration(): number { return this.generation; }

  async request<T>(path: string, body?: unknown): Promise<T> {
    const generation = this.generation;
    const response = await this.fetcher.call(globalThis, `${this.baseUrl}${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
      },
      cache: 'no-store',
      ...(body === undefined ? {} : { body: encodeTransport(body) }),
    });
    const payload = decodeTransport(await response.text()) as { error?: string };
    if (generation !== this.generation) throw new Error('A sessão mudou durante a operação.');
    if (!response.ok) throw new SharedApiError(response.status, payload.error || 'Não foi possível acessar o servidor compartilhado.');
    return payload as T;
  }

  async rpc<T>(service: 'guild' | 'chat' | 'friendship', method: string, args: unknown[]): Promise<T> {
    const suppliedArgs = [...args];
    while (suppliedArgs.length && suppliedArgs[suppliedArgs.length - 1] === undefined) suppliedArgs.pop();
    const payload = await this.request<{ result: T }>('/rpc', { service, method, args: suppliedArgs });
    return payload.result;
  }
}

class SharedAuthService implements AuthService {
  private user: User | null = null;
  private listeners = new Set<(user: User | null) => void>();

  constructor(private api: SharedApiClient) {}

  getCurrentUser(): User | null { return this.user; }

  onAuthStateChanged(callback: (user: User | null) => void): () => void {
    this.listeners.add(callback);
    return () => { this.listeners.delete(callback); };
  }

  private update(user: User | null): void {
    this.user = user;
    for (const callback of this.listeners) callback(user);
  }

  async restoreSession(): Promise<void> {
    try {
      const result = await this.api.request<{ user: User }>('/auth/session');
      this.update(result.user);
    } catch (error) {
      // Não apagar a credencial numa falha de rede; login poderá ser tentado novamente.
      this.update(null);
      if (error instanceof SyntaxError) throw new Error('Resposta inválida do backend compartilhado.');
    }
  }

  async login(): Promise<never> {
    throw new Error('No servidor compartilhado, entre com e-mail e senha.');
  }

  async loginWithGoogle(): Promise<never> {
    throw new Error('Google ainda não está configurado neste servidor. Use e-mail e senha.');
  }

  async loginWithCredentials(email: string, password: string, isSignUp = false, displayName?: string): Promise<User> {
    const result = await this.api.request<{ token: string; user: User }>(
      isSignUp ? '/auth/register' : '/auth/login', { email, password, displayName },
    );
    this.api.setToken(result.token);
    this.update(result.user);
    return result.user;
  }

  async logout(): Promise<void> {
    try { await this.api.request('/auth/logout', {}); }
    finally { this.api.setToken(null); this.update(null); }
  }
}

function createGuildService(api: SharedApiClient): GuildService {
  const rpc = <T,>(method: string, ...args: unknown[]) => api.rpc<T>('guild', method, args);
  return {
    createGuild: async () => { throw new Error('Este app utiliza um único servidor compartilhado.'); },
    ensureCommonGuild: userId => rpc('ensureCommonGuild', userId),
    getGuild: id => rpc('getGuild', id),
    getUserGuilds: id => rpc('getUserGuilds', id),
    getGuildMembers: id => rpc('getGuildMembers', id),
    getGuildChannels: (id, actorId) => rpc('getGuildChannels', id, actorId),
    getGuildRoles: id => rpc('getGuildRoles', id),
    getMemberPermissions: (id, userId, channelId) => rpc('getMemberPermissions', id, userId, channelId),
    createChannel: params => rpc('createChannel', params),
    deleteChannel: (id, actorId) => rpc('deleteChannel', id, actorId),
    createRole: params => rpc('createRole', params),
    assignRole: params => rpc('assignRole', params),
    removeRole: params => rpc('removeRole', params),
    createInvite: async () => { throw new Error('Todos os cadastrados entram no servidor automaticamente.'); },
    getInvite: async () => null,
    joinGuildByInvite: async () => { throw new Error('Entre na sua conta para acessar o servidor.'); },
  };
}

class SharedChatService implements ChatService {
  constructor(private api: SharedApiClient) {}

  sendMessage(params: Parameters<ChatService['sendMessage']>[0]): Promise<Message> {
    return this.api.rpc('chat', 'sendMessage', [params]);
  }
  getMessages(channelId: string): Promise<Message[]> {
    return this.api.rpc('chat', 'getMessages', [channelId]);
  }
  deleteMessage(params: Parameters<ChatService['deleteMessage']>[0]): Promise<boolean> {
    return this.api.rpc('chat', 'deleteMessage', [params]);
  }
  onMessagesUpdated(channelId: string, callback: (messages: Message[]) => void): () => void {
    let stopped = false;
    let pending = false;
    let previous = '';
    const generation = this.api.getGeneration();
    const poll = async () => {
      if (stopped || pending || generation !== this.api.getGeneration()) return;
      pending = true;
      try {
        const messages = await this.getMessages(channelId);
        if (stopped || generation !== this.api.getGeneration()) return;
        const next = encodeTransport(messages);
        if (next !== previous) { previous = next; callback(messages); }
      } catch (error) {
        if (!stopped && generation === this.api.getGeneration() && error instanceof SharedApiError && [401, 403].includes(error.status)) {
          previous = '[]'; callback([]);
        }
      } finally { pending = false; }
    };
    void poll();
    const interval = setInterval(() => { void poll(); }, 1200);
    return () => { stopped = true; clearInterval(interval); };
  }
  onNewMessage(channelId: string, callback: (message: Message) => void): () => void {
    let stopped = false;
    let pending = false;
    const seen = new Set<string>();
    const generation = this.api.getGeneration();
    const poll = async () => {
      if (stopped || pending || generation !== this.api.getGeneration()) return;
      pending = true;
      try {
        const messages = await this.getMessages(channelId);
        if (stopped || generation !== this.api.getGeneration()) return;
        for (const message of messages) {
          if (!seen.has(message.id)) callback(message);
          seen.add(message.id);
        }
      } catch { /* Mantém histórico atual e tenta novamente no próximo ciclo. */ }
      finally { pending = false; }
    };
    void poll();
    const interval = setInterval(() => { void poll(); }, 1200);
    return () => { stopped = true; clearInterval(interval); };
  }
}

function createFriendshipService(api: SharedApiClient): FriendshipService {
  const rpc = <T,>(method: string, ...args: unknown[]) => api.rpc<T>('friendship', method, args);
  return {
    sendFriendRequest: (user, target) => rpc('sendFriendRequest', user, target),
    acceptFriendRequest: (user, friend) => rpc('acceptFriendRequest', user, friend),
    removeFriendship: (user, friend) => rpc('removeFriendship', user, friend),
    getFriends: (user, includeDirection) => rpc('getFriends', user, includeDirection),
    blockUser: (user, target) => rpc('blockUser', user, target),
    unblockUser: (user, target) => rpc('unblockUser', user, target),
    isBlocked: (user, target) => rpc('isBlocked', user, target),
    getOrCreateDmChannel: (user, friend) => rpc('getOrCreateDmChannel', user, friend),
    getDmChannel: (dm, user) => rpc('getDmChannel', dm, user),
    getUserDms: user => rpc('getUserDms', user),
    sendDmMessage: params => rpc('sendDmMessage', params),
    getDmMessages: (dm, user, pagination) => rpc('getDmMessages', dm, user, pagination),
    onDmUpdated: (dm, user, callback) => {
      let stopped = false;
      let pending = false;
      let previous = '';
      const generation = api.getGeneration();
      const poll = async () => {
        if (stopped || pending || generation !== api.getGeneration()) return;
        pending = true;
        try {
          const messages = await rpc('getDmMessages', dm, user);
          if (stopped || generation !== api.getGeneration()) return;
          const next = encodeTransport(messages);
          if (next !== previous) { previous = next; callback(); }
        } catch {
          if (!stopped && generation === api.getGeneration()) callback();
        } finally { pending = false; }
      };
      void poll();
      const interval = setInterval(() => { void poll(); }, 1200);
      return () => { stopped = true; clearInterval(interval); };
    },
  };
}

export async function createRemoteAppServices(options: { baseUrl?: string; fetcher?: typeof fetch } = {}) {
  const api = new SharedApiClient(options.baseUrl, options.fetcher);
  await api.request('/health');
  const authService = new SharedAuthService(api);
  await authService.restoreSession();
  return {
    authService,
    chatService: new SharedChatService(api),
    guildService: createGuildService(api),
    friendshipService: createFriendshipService(api),
    mediaService: new MockMediaService(),
    callController: new DesktopCallController(),
    presenceService: new InMemoryPresenceService(),
    userDirectory: () => api.request<User[]>('/users'),
    sharedBackend: true,
  };
}
