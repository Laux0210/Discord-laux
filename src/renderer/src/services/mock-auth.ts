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

export class MockAuthService implements AuthService {
  private currentUser: User | null = null;

  async login(username: string): Promise<User | null> {
    const found = SEED_USERS.find((u) => u.username === username);
    if (found) {
      this.currentUser = { ...found };
      return this.currentUser;
    }

    // Se não for um dos pré-cadastrados, cria usuário efêmero
    this.currentUser = {
      id: `user-${Date.now()}`,
      username,
      displayName: username,
      avatarUrl: ''
    };
    return this.currentUser;
  }

  async logout(): Promise<void> {
    this.currentUser = null;
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }
}
