import type { User, Message } from '../../../common/types';

/** Adapter síncrono: erros de gravação devem ser propagados ao chamador. */
export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
}

export function readSnapshot<T>(storage: StorageAdapter | undefined, key: string): T | null {
  const raw = storage?.getItem(key);
  if (raw === null || raw === undefined) return null;
  try {
    const snapshot = JSON.parse(raw);
    if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot) || snapshot.version !== 1 ||
      !Object.prototype.hasOwnProperty.call(snapshot, 'data') || snapshot.data === null || typeof snapshot.data !== 'object') throw new Error();
    return snapshot.data as T;
  } catch {
    throw new Error(`ARMAZENAMENTO_INVALIDO: ${key}; dados preservados para recuperação`);
  }
}

interface ExtendedMessage extends Message {
  nonce?: string;
}

export interface StoredAccount {
  id: string;
  email: string;
  username: string;
  displayName: string;
  password?: string;
  provider: 'credentials' | 'google';
  createdAt: number;
}

const STORAGE_KEYS = {
  CURRENT_USER: 'discord_laux_v1_current_user',
  CHANNEL_MESSAGES: 'discord_laux_v1_channel_messages',
  DIRECT_MESSAGES: 'discord_laux_v1_direct_messages',
  USER_SETTINGS: 'discord_laux_v1_user_settings',
  FRIENDS: 'discord_laux_v1_friends',
  ACCOUNTS: 'discord_laux_v1_accounts'
} as const;

export class StorageService {
  private memoryCache: Map<string, string> = new Map();

  private accountMemory: Record<string, StoredAccount> = {};

  constructor(private adapter?: StorageAdapter) {}

  private isLocalStorageAvailable(): boolean {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return false;
      }
      const testKey = '__test_storage__';
      window.localStorage.setItem(testKey, '1');
      window.localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  public getItem(key: string): string | null {
    if (this.adapter) return this.adapter.getItem(key);
    if (typeof window !== 'undefined') {
      try { return window.localStorage?.getItem(key) ?? null; }
      catch { return null; }
    }
    return null;
  }

  public setItem(key: string, value: string): void {
    if (this.adapter) { this.adapter.setItem(key, value); return; }
    if (typeof window !== 'undefined') {
      window.localStorage?.setItem(key, value);
    }
  }

  public removeItem(key: string): void {
    if (this.adapter) { this.adapter.removeItem?.(key); return; }
    if (typeof window !== 'undefined') window.localStorage?.removeItem(key);
    this.memoryCache.delete(key);
  }

  // --- Usuário Atual ---
  public getCurrentUser(): User | null {
    const raw = this.getItem(STORAGE_KEYS.CURRENT_USER);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as User;
    } catch {
      return null;
    }
  }

  public saveCurrentUser(user: User | null): void {
    if (!user) {
      this.removeItem(STORAGE_KEYS.CURRENT_USER);
      return;
    }
    this.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
  }

  // --- Contas Cadastradas (E-mail/Senha e Google) ---
  public getAccounts(): Record<string, StoredAccount> {
    const raw = this.getItem(STORAGE_KEYS.ACCOUNTS);
    if (!raw) return this.accountMemory;
    try {
      return { ...this.accountMemory, ...JSON.parse(raw) };
    } catch {
      return this.accountMemory;
    }
  }

  public getAccount(email: string): StoredAccount | null {
    const accounts = this.getAccounts();
    const normalized = email.trim().toLowerCase();
    return accounts[normalized] ?? null;
  }

  public saveAccount(account: StoredAccount): void {
    const accounts = { ...this.getAccounts() };
    const normalized = account.email.trim().toLowerCase();
    accounts[normalized] = account;
    this.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(accounts));
    this.accountMemory[normalized] = account;
  }

  /** Perfis públicos; nunca inclui senha ou e-mail de outra conta. */
  public listKnownUsers(): User[] {
    const users: User[] = [
      { id: 'user-1', username: 'amigo-1', displayName: 'Amigo Um (Dono)' },
      { id: 'user-2', username: 'amigo-2', displayName: 'Amigo Dois' },
      { id: 'user-3', username: 'amigo-3', displayName: 'Amigo Três' }
    ];
    for (const account of Object.values(this.getAccounts())) {
      if (account && typeof account.id === 'string' && typeof account.username === 'string') {
        if (!users.some(user => user.id === account.id)) {
          users.push({ id: account.id, username: account.username, displayName: account.displayName });
        }
      }
    }
    return users;
  }

  // --- Mensagens de Canais ---
  public getAllChannelMessages(): Record<string, ExtendedMessage[]> {
    const raw = this.getItem(STORAGE_KEYS.CHANNEL_MESSAGES);
    if (!raw) return {};
    try {
      const messages: unknown = JSON.parse(raw);
      if (!messages || typeof messages !== 'object' || Array.isArray(messages)) throw new Error();
      for (const [channelId, list] of Object.entries(messages)) {
        if (!Array.isArray(list) || list.some(message => !message || typeof message.id !== 'string' ||
          message.channelId !== channelId || typeof message.content !== 'string' || typeof message.authorId !== 'string' ||
          typeof message.authorName !== 'string' || typeof message.createdAt !== 'number' || !Number.isFinite(message.createdAt))) throw new Error();
      }
      return messages as Record<string, ExtendedMessage[]>;
    } catch {
      throw new Error('ARMAZENAMENTO_INVALIDO: histórico legado preservado para recuperação');
    }
  }

  public getChannelMessages(channelId: string): ExtendedMessage[] | null {
    const all = this.getAllChannelMessages();
    return all[channelId] ?? null;
  }

  public saveChannelMessage(channelId: string, message: ExtendedMessage): void {
    const all = this.getAllChannelMessages();
    if (!all[channelId]) {
      all[channelId] = [];
    }
    // Evita duplicatas se mesmo id ou nonce
    const exists = all[channelId].some((m) => m.id === message.id || (message.nonce && m.nonce === message.nonce));
    if (!exists) {
      all[channelId].push(message);
      this.setItem(STORAGE_KEYS.CHANNEL_MESSAGES, JSON.stringify(all));
    }
  }

  public saveAllChannelMessages(channelId: string, messages: ExtendedMessage[]): void {
    const all = this.getAllChannelMessages();
    all[channelId] = messages;
    this.setItem(STORAGE_KEYS.CHANNEL_MESSAGES, JSON.stringify(all));
  }

  // --- Mensagens Diretas (DMs) ---
  public getAllDirectMessages(): Record<string, ExtendedMessage[]> {
    const raw = this.getItem(STORAGE_KEYS.DIRECT_MESSAGES);
    if (!raw) return {};
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }

  public getDirectMessages(dmId: string): ExtendedMessage[] | null {
    const all = this.getAllDirectMessages();
    return all[dmId] ?? null;
  }

  public saveDirectMessage(dmId: string, message: ExtendedMessage): void {
    const all = this.getAllDirectMessages();
    if (!all[dmId]) {
      all[dmId] = [];
    }
    const exists = all[dmId].some((m) => m.id === message.id);
    if (!exists) {
      all[dmId].push(message);
      this.setItem(STORAGE_KEYS.DIRECT_MESSAGES, JSON.stringify(all));
    }
  }

  // --- Configurações de Usuário (Volume, Áudio, Aparência) ---
  public getSettings<T = Record<string, any>>(): Partial<T> {
    const raw = this.getItem(STORAGE_KEYS.USER_SETTINGS);
    if (!raw) return {};
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }

  public saveSettings(settings: Record<string, any>): void {
    const current = this.getSettings();
    const updated = { ...current, ...settings };
    this.setItem(STORAGE_KEYS.USER_SETTINGS, JSON.stringify(updated));
  }

  // --- Limpar Tudo ---
  public clearAll(): void {
    if (this.isLocalStorageAvailable()) {
      window.localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
      window.localStorage.removeItem(STORAGE_KEYS.CHANNEL_MESSAGES);
      window.localStorage.removeItem(STORAGE_KEYS.DIRECT_MESSAGES);
      window.localStorage.removeItem(STORAGE_KEYS.USER_SETTINGS);
      window.localStorage.removeItem(STORAGE_KEYS.FRIENDS);
    }
    this.memoryCache.clear();
  }
}

export const storageService = new StorageService();

/** O banco persistente não pode confundir falha de leitura com banco vazio. */
function requireBrowserStorage(): Storage {
  if (typeof window === 'undefined' || !window.localStorage) {
    throw new Error('ARMAZENAMENTO_INDISPONIVEL: permita armazenamento local neste navegador');
  }
  return window.localStorage;
}

export const browserStorageAdapter: StorageAdapter = {
  getItem: key => requireBrowserStorage().getItem(key),
  setItem: (key, value) => requireBrowserStorage().setItem(key, value),
  removeItem: key => requireBrowserStorage().removeItem(key)
};
