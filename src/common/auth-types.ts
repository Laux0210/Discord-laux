import type { User } from './types';

export interface AuthSession {
  user: User;
  token: string;
  expiresAt: number; // Unix epoch ms
  refreshToken?: string;
}

export interface LoginParams {
  provider: 'google' | 'mock' | 'credentials';
  mockUsername?: string;
  email?: string;
  password?: string;
  isSignUp?: boolean;
  displayName?: string;
}

export interface CallbackParams {
  code: string;
  state: string;
}

export interface SessionStorageAdapter {
  load(): Promise<AuthSession | null>;
  save(session: AuthSession): Promise<void>;
  clear(): Promise<void>;
}

export interface AuthService {
  initiateLogin(provider?: 'google'): { authUrl: string; state: string };
  handleCallback(params: CallbackParams): Promise<User>;
  login(params?: LoginParams): Promise<User>;
  loginWithCredentials?(email: string, password: string, isSignUp?: boolean, displayName?: string): Promise<User>;
  loginWithGoogle?(): Promise<User>;
  restoreSession(): Promise<User | null>;
  logout(): Promise<void>;
  getCurrentUser(): User | null;
  onAuthStateChanged(callback: (user: User | null) => void): () => void;
}
