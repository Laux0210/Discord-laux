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

    // Se não for um dos pré-cadastrados, cria usuário efêmero
    this.currentUser = {
      id: `user-${Date.now()}`,
      username,
      displayName: username,
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
