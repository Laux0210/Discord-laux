import type {
  AuthService,
  AuthSession,
  CallbackParams,
  LoginParams
} from '../../../common/auth-types';
import type { User } from '../../../common/types';
import { SessionManager } from './session-manager';

export interface OAuthConfig {
  clientId: string;
  redirectUri: string;
  authEndpoint?: string;
}

const SEED_USERS: Record<string, User> = {
  'amigo-1': {
    id: 'user-1',
    username: 'amigo-1',
    displayName: 'Amigo Um (Dono)',
    avatarUrl: ''
  },
  'amigo-2': {
    id: 'user-2',
    username: 'amigo-2',
    displayName: 'Amigo Dois',
    avatarUrl: ''
  },
  'amigo-3': {
    id: 'user-3',
    username: 'amigo-3',
    displayName: 'Amigo Três',
    avatarUrl: ''
  }
};

function generateRandomState(): string {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const arr = new Uint8Array(16);
    crypto.getRandomValues(arr);
    return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
  }
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export class DesktopAuthService implements AuthService {
  private currentUser: User | null = null;
  private pendingStates = new Set<string>();
  private listeners: ((user: User | null) => void)[] = [];

  constructor(
    private sessionManager: SessionManager,
    private config: OAuthConfig = {
      clientId: 'google-client-mock',
      redirectUri: 'discord-desktop://auth/callback',
      authEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth'
    }
  ) {}

  initiateLogin(_provider: 'google' = 'google'): { authUrl: string; state: string } {
    const state = generateRandomState();
    this.pendingStates.add(state);

    const base = this.config.authEndpoint || 'https://accounts.google.com/o/oauth2/v2/auth';
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state
    });

    return {
      authUrl: `${base}?${params.toString()}`,
      state
    };
  }

  async handleCallback(params: CallbackParams): Promise<User> {
    if (!params.state || !this.pendingStates.has(params.state)) {
      throw new Error('Falha de validação Anti-CSRF: state não reconhecido ou expirado.');
    }
    this.pendingStates.delete(params.state);

    if (!params.code) {
      throw new Error('Código de autorização não fornecido no callback.');
    }

    // Cria/simula usuário autenticado através do OAuth
    const user: User = {
      id: `user-google-${params.code.slice(0, 8)}`,
      username: `google_user_${params.code.slice(0, 6)}`,
      displayName: 'Usuário Google Autenticado',
      avatarUrl: ''
    };

    const session: AuthSession = {
      user,
      token: `jwt-oauth-${Date.now()}`,
      expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 7 // 7 dias
    };

    await this.sessionManager.saveSession(session);
    this.currentUser = user;
    this.notifyListeners();
    return user;
  }

  async login(params?: LoginParams): Promise<User> {
    if (params?.provider === 'mock' && params.mockUsername) {
      const existing = SEED_USERS[params.mockUsername];
      const user: User = existing || {
        id: `user-${Date.now()}`,
        username: params.mockUsername,
        displayName: params.mockUsername,
        avatarUrl: ''
      };

      const session: AuthSession = {
        user,
        token: `jwt-mock-${Date.now()}`,
        expiresAt: Date.now() + 1000 * 60 * 60 * 24 // 24 horas
      };

      await this.sessionManager.saveSession(session);
      this.currentUser = user;
      this.notifyListeners();
      return user;
    }

    // Default mock user se nada especificado
    return this.login({ provider: 'mock', mockUsername: 'amigo-1' });
  }

  async restoreSession(): Promise<User | null> {
    const session = await this.sessionManager.loadSession();
    if (session && session.user) {
      this.currentUser = session.user;
      this.notifyListeners();
      return this.currentUser;
    }
    this.currentUser = null;
    return null;
  }

  async logout(): Promise<void> {
    await this.sessionManager.clearSession();
    this.currentUser = null;
    this.notifyListeners();
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  onAuthStateChanged(callback: (user: User | null) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      try {
        listener(this.currentUser);
      } catch (err) {
        console.error('Erro em listener de auth state:', err);
      }
    }
  }
}
