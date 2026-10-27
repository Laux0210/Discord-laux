import type { VoiceParticipant } from './types';

export interface AudioDevice {
  deviceId: string;
  label: string;
  kind: 'audioinput' | 'audiooutput';
}

export interface CallState {
  channelId: string | null;
  guildId: string | null;
  participants: VoiceParticipant[];
  activeScreenShareUserId: string | null;
  startedAt: number | null;
}

export interface CallController {
  joinCall(channelId: string, guildId: string, userId: string, displayName: string): Promise<boolean>;
  leaveCall(userId: string): Promise<void>;
  startScreenShare(userId: string): Promise<boolean>;
  stopScreenShare(userId: string): Promise<void>;
  setMute(userId: string, isMuted: boolean): Promise<void>;
  setDeafen(userId: string, isDeafened: boolean): Promise<void>;
  kickParticipant(targetUserId: string, actorId: string, actorPermissions: bigint): Promise<boolean>;
  getCallState(): CallState;
  getAudioDevices(): Promise<AudioDevice[]>;
  setAudioDevice(kind: 'audioinput' | 'audiooutput', deviceId: string): Promise<void>;
  setSpeaking?(userId: string, isSpeaking: boolean): Promise<void>;
  getScreenStream?(userId: string): MediaStream | null;
  triggerEmergencyBudgetCutoff(): Promise<void>;
  onCallStateUpdated(callback: (state: CallState) => void): () => void;

}
