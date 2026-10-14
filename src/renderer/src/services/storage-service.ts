import type { User, Message } from '../../../common/types';

interface ExtendedMessage extends Message {
  nonce?: string;
}

const STORAGE_KEYS = {
  CURRENT_USER: 'discord_laux_v1_current_user',
  CHANNEL_MESSAGES: 'discord_laux_v1_channel_messages',
  DIRECT_MESSAGES: 'discord_laux_v1_direct_messages',
  USER_SETTINGS: 'discord_laux_v1_user_settings',
  FRIENDS: 'discord_laux_v1_friends'
} as const;

export class StorageService {
  private memoryCache: Map<string, string> = new Map();

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

  private getItem(key: string): string | null {
    if (this.isLocalStorageAvailable()) {
      return window.localStorage.getItem(key);
    }
    return null;
  }

  private setItem(key: string, value: string): void {
    if (this.isLocalStorageAvailable()) {
      try {
        window.localStorage.setItem(key, value);
      } catch (e) {
        console.warn('Falha ao escrever em localStorage:', e);
      }
    }
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
      if (this.isLocalStorageAvailable()) {
        window.localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
      }
      this.memoryCache.delete(STORAGE_KEYS.CURRENT_USER);
      return;
    }
    this.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
  }

  // --- Mensagens de Canais ---
  public getAllChannelMessages(): Record<string, ExtendedMessage[]> {
    const raw = this.getItem(STORAGE_KEYS.CHANNEL_MESSAGES);
    if (!raw) return {};
    try {
      return JSON.parse(raw);
    } catch {
      return {};
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
