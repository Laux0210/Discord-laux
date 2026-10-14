import type {
  PresenceService,
  PresenceStatus,
  UserPresence
} from '../../../common/text-types';

export const PRESENCE_TTL_MS = 30_000; // 30 segundos de TTL para expiração efêmera

export class InMemoryPresenceService implements PresenceService {
  private presences = new Map<string, UserPresence>();
  private listeners: ((presence: UserPresence) => void)[] = [];

  setPresence(userId: string, status: PresenceStatus): void {
    const existing = this.presences.get(userId);
    const oldEffectiveStatus = existing ? this.getPresence(userId) : 'offline';

    const updated: UserPresence = {
      userId,
      status,
      lastSeen: Date.now()
    };
    this.presences.set(userId, updated);

    if (oldEffectiveStatus !== status) {
      this.notifyListeners(updated);
    }
  }

  heartbeat(userId: string): void {
    const existing = this.presences.get(userId);
    const now = Date.now();
    if (!existing) {
      const initial: UserPresence = {
        userId,
        status: 'online',
        lastSeen: now
      };
      this.presences.set(userId, initial);
      this.notifyListeners(initial);
      return;
    }

    const oldEffectiveStatus = this.getPresence(userId);
    existing.lastSeen = now;

    if (oldEffectiveStatus === 'offline' && existing.status !== 'offline') {
      this.notifyListeners(existing);
    }
  }

  getPresence(userId: string): PresenceStatus {
    const entry = this.presences.get(userId);
    if (!entry) return 'offline';

    if (entry.status !== 'offline') {
      const elapsed = Date.now() - entry.lastSeen;
      if (elapsed > PRESENCE_TTL_MS) {
        entry.status = 'offline';
        return 'offline';
      }
    }

    return entry.status;
  }

  onPresenceUpdate(callback: (presence: UserPresence) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  private notifyListeners(presence: UserPresence): void {
    for (const listener of this.listeners) {
      try {
        listener({ ...presence });
      } catch (err) {
        console.error('Erro em listener de presença:', err);
      }
    }
  }
}
