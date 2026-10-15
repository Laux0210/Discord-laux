import type { User } from '../../../common/types';
import type { AuthService } from './types';

const SEED_USERS: User[] = [
  {
    id: 'user-1',
    username: 'amigo-1',
    displayName: 'Amigo Um (Dono)',
    avatarUrl: ''
  },
  {
    id: 'user-2',
    username: 'amigo-2',
    displayName: 'Amigo Dois',
    avatarUrl: ''
  },
  {
    id: 'user-3',
    username: 'amigo-3',
    displayName: 'Amigo Três',
    avatarUrl: ''
  }
];

import { storageService } from './storage-service';

export class MockAuthService implements AuthService {
  private currentUser: User | null = null;

  constructor() {
    const saved = storageService.getCurrentUser();
    if (saved) {
      this.currentUser = saved;
    }
  }

  async login(username: string): Promise<User | null> {
    const found = SEED_USERS.find((u) => u.username === username);
    if (found) {
      this.currentUser = { ...found };
      storageService.saveCurrentUser(this.currentUser);
      return this.currentUser;
    }

    // Se for e-mail, pode corresponder a uma conta já cadastrada
    if (username.includes('@')) {
      const existingAccount = storageService.getAccount(username);
      if (existingAccount) {
        this.currentUser = {
          id: existingAccount.id,
          username: existingAccount.username,
          displayName: existingAccount.displayName,
          avatarUrl: ''
        };
        storageService.saveCurrentUser(this.currentUser);
        return this.currentUser;
      }
    }

    // Se não for um dos pré-cadastrados, cria usuário efêmero
    this.currentUser = {
      id: `user-${Date.now()}`,
      username,
      displayName: username.includes('@') ? username.split('@')[0] : username,
      avatarUrl: ''
    };
    storageService.saveCurrentUser(this.currentUser);
    return this.currentUser;
  }

  async loginWithCredentials(
    email: string,
    password?: string,
    isSignUp?: boolean,
    displayName?: string
  ): Promise<User> {
    if (!email || !email.includes('@')) {
      throw new Error('Por favor, informe um endereço de e-mail válido.');
    }
    if (password !== undefined && password.length < 6) {
      throw new Error('A senha deve ter no mínimo 6 caracteres.');
    }

    const normalizedEmail = email.trim().toLowerCase();
    const cleanUsername = normalizedEmail.split('@')[0].replace(/[^a-z0-9_-]/g, '_');
    const existing = storageService.getAccount(normalizedEmail);

    if (isSignUp) {
      if (existing) {
        throw new Error('Este endereço de e-mail já está cadastrado.');
      }
      const newAccount = {
        id: `user-${cleanUsername}-${Date.now()}`,
        email: normalizedEmail,
        username: cleanUsername,
        displayName: displayName?.trim() || cleanUsername,
        password: password || '',
        provider: 'credentials' as const,
        createdAt: Date.now()
      };
      storageService.saveAccount(newAccount);
      this.currentUser = {
        id: newAccount.id,
        username: newAccount.username,
        displayName: newAccount.displayName,
        avatarUrl: ''
      };
      storageService.saveCurrentUser(this.currentUser);
      return this.currentUser;
    }

    if (existing) {
      if (password && existing.password && existing.password !== password) {
        throw new Error('Senha incorreta. Verifique suas credenciais.');
      }
      this.currentUser = {
        id: existing.id,
        username: existing.username,
        displayName: existing.displayName,
        avatarUrl: ''
      };
      storageService.saveCurrentUser(this.currentUser);
      return this.currentUser;
    }

    // Se a conta não existe e o usuário está entrando direto, cria automaticamente
    const autoAccount = {
      id: `user-${cleanUsername}-${Date.now()}`,
      email: normalizedEmail,
      username: cleanUsername,
      displayName: displayName?.trim() || cleanUsername,
      password: password || '',
      provider: 'credentials' as const,
      createdAt: Date.now()
    };
    storageService.saveAccount(autoAccount);
    this.currentUser = {
      id: autoAccount.id,
      username: autoAccount.username,
      displayName: autoAccount.displayName,
      avatarUrl: ''
    };
    storageService.saveCurrentUser(this.currentUser);
    return this.currentUser;
  }

  async loginWithGoogle(email?: string, displayName?: string): Promise<User> {
    const googleEmail = email?.trim().toLowerCase() || 'usuario.google@gmail.com';
    const cleanUsername = googleEmail.split('@')[0].replace(/[^a-z0-9_-]/g, '_');

    let existing = storageService.getAccount(googleEmail);
    if (!existing) {
      existing = {
        id: `user-google-${Date.now()}`,
        email: googleEmail,
        username: cleanUsername,
        displayName: displayName || 'Usuário Google',
        provider: 'google' as const,
        createdAt: Date.now()
      };
      storageService.saveAccount(existing);
    }

    this.currentUser = {
      id: existing.id,
      username: existing.username,
      displayName: existing.displayName,
      avatarUrl: ''
    };
    storageService.saveCurrentUser(this.currentUser);
    return this.currentUser;
  }

  async logout(): Promise<void> {
    this.currentUser = null;
    storageService.saveCurrentUser(null);
  }

  getCurrentUser(): User | null {
    if (!this.currentUser) {
      const saved = storageService.getCurrentUser();
      if (saved) {
        this.currentUser = saved;
      }
    }
    return this.currentUser;
  }

  setCurrentUser(user: User | null): void {
    this.currentUser = user;
    storageService.saveCurrentUser(user);
  }

  updateProfile(fields: Partial<User>): User | null {
    if (!this.currentUser) return null;
    this.currentUser = {
      ...this.currentUser,
      ...fields
    };
    storageService.saveCurrentUser(this.currentUser);
    return this.currentUser;
  }
}
