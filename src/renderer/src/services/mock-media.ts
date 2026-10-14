import type { VoiceParticipant } from '../../../common/types';
import type { MediaService } from './types';

export const MAX_VOICE_PARTICIPANTS = 10;
export const MAX_SIMULTANEOUS_SCREEN_SHARES = 1;

export class MockMediaService implements MediaService {
  private participants: Map<string, VoiceParticipant> = new Map();
  private listeners: Set<(participants: VoiceParticipant[]) => void> = new Set();

  async joinCall(userId: string, displayName: string): Promise<boolean> {
    if (this.participants.has(userId)) {
      return true;
    }

    if (this.participants.size >= MAX_VOICE_PARTICIPANTS) {
      return false; // Rejeita décimo primeiro participante (D-02)
    }

    const participant: VoiceParticipant = {
      userId,
      displayName,
      isMuted: false,
      isDeafened: false,
      isScreenSharing: false,
      joinedAt: Date.now()
    };

    this.participants.set(userId, participant);
    this.notifyListeners();
    return true;
  }

  async leaveCall(userId: string): Promise<void> {
    if (this.participants.delete(userId)) {
      this.notifyListeners();
    }
  }

  async startScreenShare(userId: string): Promise<boolean> {
    const participant = this.participants.get(userId);
    if (!participant) {
      return false;
    }

    // Verifica se já existe outra pessoa transmitindo
    const currentStreams = Array.from(this.participants.values()).filter((p) => p.isScreenSharing);
    if (currentStreams.length >= MAX_SIMULTANEOUS_SCREEN_SHARES && !participant.isScreenSharing) {
      return false; // Apenas uma tela ativa simultaneamente (D-02)
    }

    participant.isScreenSharing = true;
    this.notifyListeners();
    return true;
  }

  async stopScreenShare(userId: string): Promise<void> {
    const participant = this.participants.get(userId);
    if (participant && participant.isScreenSharing) {
      participant.isScreenSharing = false;
      this.notifyListeners();
    }
  }

  async setMute(userId: string, isMuted: boolean): Promise<void> {
    const participant = this.participants.get(userId);
    if (participant) {
      participant.isMuted = isMuted;
      this.notifyListeners();
    }
  }

  async setDeafen(userId: string, isDeafened: boolean): Promise<void> {
    const participant = this.participants.get(userId);
    if (participant) {
      participant.isDeafened = isDeafened;
      if (isDeafened) {
        participant.isMuted = true; // Deafen implica mute
      }
      this.notifyListeners();
    }
  }

  getParticipants(): VoiceParticipant[] {
    return Array.from(this.participants.values());
  }

  onParticipantsUpdated(callback: (participants: VoiceParticipant[]) => void): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notifyListeners(): void {
    const list = this.getParticipants();
    for (const listener of this.listeners) {
      listener(list);
    }
  }
}
