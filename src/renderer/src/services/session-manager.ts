import type { AuthSession, SessionStorageAdapter } from '../../../common/auth-types';

export class InMemorySessionStorage implements SessionStorageAdapter {
  private session: AuthSession | null = null;

  async load(): Promise<AuthSession | null> {
    return this.session ? { ...this.session } : null;
  }

  async save(session: AuthSession): Promise<void> {
    this.session = { ...session };
  }

  async clear(): Promise<void> {
    this.session = null;
  }
}

export class LocalStorageSessionAdapter implements SessionStorageAdapter {
  private storageKey = 'discord_desktop_session';

  async load(): Promise<AuthSession | null> {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const raw = window.localStorage.getItem(this.storageKey);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthSession;
    } catch {
      return null;
    }
  }

  async save(session: AuthSession): Promise<void> {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(this.storageKey, JSON.stringify(session));
  }

  async clear(): Promise<void> {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.removeItem(this.storageKey);
  }
}

export class SessionManager {
  constructor(private adapter: SessionStorageAdapter) {}

  async saveSession(session: AuthSession): Promise<void> {
    await this.adapter.save(session);
  }

  async loadSession(): Promise<AuthSession | null> {
    const session = await this.adapter.load();
    if (!session) return null;

    // Se estiver expirada, limpa automaticamente e descarta
    if (session.expiresAt <= Date.now()) {
      await this.adapter.clear();
      return null;
    }

    return session;
  }

  async clearSession(): Promise<void> {
    await this.adapter.clear();
  }
}
