import type {
  CallController,
  CallState,
  AudioDevice
} from '../../../common/media-types';
import type { VoiceParticipant } from '../../../common/types';
import { PermissionFlags, hasPermission } from '../../../common/permissions';

export class DesktopCallController implements CallController {
  private channelId: string | null = null;
  private guildId: string | null = null;
  private participants: Map<string, VoiceParticipant> = new Map();
  private activeScreenShareUserId: string | null = null;
  private startedAt: number | null = null;
  private listeners: Set<(state: CallState) => void> = new Set();

  private selectedInputDeviceId: string = 'default';
  private selectedOutputDeviceId: string = 'default';

  private defaultDevices: AudioDevice[] = [
    { deviceId: 'default', label: 'Microfone Padrão do Sistema', kind: 'audioinput' },
    { deviceId: 'mic-virtual', label: 'Microfone Virtual Discord Local', kind: 'audioinput' },
    { deviceId: 'default', label: 'Alto-falantes Padrão do Sistema', kind: 'audiooutput' },
    { deviceId: 'speaker-virtual', label: 'Saída de Áudio Local Mock', kind: 'audiooutput' }
  ];

  public getCallState(): CallState {
    return {
      channelId: this.channelId,
      guildId: this.guildId,
      participants: Array.from(this.participants.values()),
      activeScreenShareUserId: this.activeScreenShareUserId,
      startedAt: this.startedAt
    };
  }

  public async joinCall(
    channelId: string,
    guildId: string,
    userId: string,
    displayName: string
  ): Promise<boolean> {
    // 1. Verificar se já há chamada em andamento em outro canal
    if (this.channelId && this.channelId !== channelId && this.participants.size > 0) {
      throw new Error('CHAMADA_GLOBAL_EM_ANDAMENTO');
    }

    // 2. Se o usuário já está na sala, atualiza atributos
    const existing = this.participants.get(userId);
    if (existing) {
      existing.displayName = displayName;
      this.notifyListeners();
      return true;
    }

    // 3. Limite estrito de 10 participantes
    if (this.participants.size >= 10) {
      throw new Error('CAPACIDADE_CHAMADA_EXCEDIDA');
    }

    // 4. Se for a primeira entrada, inicializa a chamada
    if (!this.channelId) {
      this.channelId = channelId;
      this.guildId = guildId;
      this.startedAt = Date.now();
    }

    const newParticipant: VoiceParticipant = {
      userId,
      displayName,
      isMuted: false,
      isDeafened: false,
      isScreenSharing: false,
      joinedAt: Date.now()
    };

    this.participants.set(userId, newParticipant);
    this.notifyListeners();
    return true;
  }

  public async leaveCall(userId: string): Promise<void> {
    if (!this.participants.has(userId)) {
      return;
    }

    // Se quem saiu estava compartilhando tela, libera a tela imediatamente
    if (this.activeScreenShareUserId === userId) {
      this.activeScreenShareUserId = null;
    }

    this.participants.delete(userId);

    // Se a sala esvaziou, encerra a chamada e libera o canal
    if (this.participants.size === 0) {
      this.channelId = null;
      this.guildId = null;
      this.startedAt = null;
      this.activeScreenShareUserId = null;
    }

    this.notifyListeners();
  }

  public async startScreenShare(userId: string): Promise<boolean> {
    const participant = this.participants.get(userId);
    if (!participant) {
      throw new Error('PARTICIPANTE_NAO_ENCONTRADO');
    }

    if (this.activeScreenShareUserId && this.activeScreenShareUserId !== userId) {
      throw new Error('TRANSMISSAO_JA_ATIVA');
    }

    this.activeScreenShareUserId = userId;
    participant.isScreenSharing = true;
    this.notifyListeners();
    return true;
  }

  public async stopScreenShare(userId: string): Promise<void> {
    const participant = this.participants.get(userId);
    if (participant) {
      participant.isScreenSharing = false;
    }

    if (this.activeScreenShareUserId === userId) {
      this.activeScreenShareUserId = null;
      this.notifyListeners();
    }
  }

  public async setMute(userId: string, isMuted: boolean): Promise<void> {
    const participant = this.participants.get(userId);
    if (!participant) {
      throw new Error('PARTICIPANTE_NAO_ENCONTRADO');
    }

    participant.isMuted = isMuted;
    this.notifyListeners();
  }

  public async setDeafen(userId: string, isDeafened: boolean): Promise<void> {
    const participant = this.participants.get(userId);
    if (!participant) {
      throw new Error('PARTICIPANTE_NAO_ENCONTRADO');
    }

    participant.isDeafened = isDeafened;
    // Cascata contratual: ativar deafen força mute automático
    if (isDeafened) {
      participant.isMuted = true;
    }

    this.notifyListeners();
  }

  public async kickParticipant(
    targetUserId: string,
    _actorId: string,
    actorPermissions: bigint
  ): Promise<boolean> {
    const canKick =
      hasPermission(actorPermissions, PermissionFlags.KICK_MEMBERS) ||
      hasPermission(actorPermissions, PermissionFlags.ADMINISTRATOR);

    if (!canKick) {
      throw new Error('PERMISSAO_NEGADA');
    }

    if (!this.participants.has(targetUserId)) {
      return false;
    }

    await this.leaveCall(targetUserId);
    return true;
  }

  public async getAudioDevices(): Promise<AudioDevice[]> {
    return [...this.defaultDevices];
  }

  public async setAudioDevice(
    kind: 'audioinput' | 'audiooutput',
    deviceId: string
  ): Promise<void> {
    if (kind === 'audioinput') {
      this.selectedInputDeviceId = deviceId;
    } else {
      this.selectedOutputDeviceId = deviceId;
    }
  }

  public getSelectedAudioDevices(): { input: string; output: string } {
    return {
      input: this.selectedInputDeviceId,
      output: this.selectedOutputDeviceId
    };
  }

  public async triggerEmergencyBudgetCutoff(): Promise<void> {
    this.participants.clear();
    this.channelId = null;
    this.guildId = null;
    this.startedAt = null;
    this.activeScreenShareUserId = null;
    this.notifyListeners();
  }

  public onCallStateUpdated(callback: (state: CallState) => void): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notifyListeners(): void {
    const state = this.getCallState();
    for (const listener of this.listeners) {
      try {
        listener(state);
      } catch (err) {
        console.error('Erro em ouvinte de estado de chamada:', err);
      }
    }
  }
}
