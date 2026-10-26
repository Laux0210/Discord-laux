import type { CallController, CallState, AudioDevice } from '../../../common/media-types';
import type { User, VoiceParticipant } from '../../../common/types';
import type { SupabaseRestClient } from './supabase-app-services';

/**
 * Voz real sobre Supabase: presença em `voice_states` e sinalização WebRTC em `voice_signals`
 * (supabase/migrations/20261026000008_voice_signaling.sql). Malha P2P de áudio entre todos os
 * participantes; o RLS só deixa sinalizar quem está no mesmo canal e tem CONNECT.
 * Limite prático da malha: 4 a 6 pessoas por canal.
 */

const POLL_MS = 1000;
const HEARTBEAT_MS = 5000;
const STALE_MS = 20000;
const ICE_SERVERS: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }];

interface VoiceStateRow {
  user_id: string;
  channel_id: string;
  display_name: string;
  is_muted: boolean;
  is_deafened: boolean;
  joined_at: string;
  updated_at: string;
}

interface SignalRow {
  id: string;
  from_id: string;
  kind: 'offer' | 'answer' | 'ice' | 'bye';
  payload: { sdp?: string; type?: RTCSdpType; candidate?: RTCIceCandidateInit };
}

/** Quem tem o menor id inicia a oferta; evita ofertas cruzadas. */
export function shouldInitiate(selfId: string, otherId: string): boolean {
  return selfId < otherId;
}

export function isFresh(updatedAt: string, now = Date.now()): boolean {
  return now - Date.parse(updatedAt) < STALE_MS;
}

export class SupabaseCallController implements CallController {
  private channelId: string | null = null;
  private guildId: string | null = null;
  private startedAt: number | null = null;
  private participants: VoiceParticipant[] = [];
  private listeners = new Set<(state: CallState) => void>();
  private peers = new Map<string, RTCPeerConnection>();
  private audios = new Map<string, HTMLAudioElement>();
  private local: MediaStream | null = null;
  private muted = false;
  private deafened = false;
  private inputDeviceId = 'default';
  private outputDeviceId = 'default';
  private timers: ReturnType<typeof setInterval>[] = [];
  private polling = false;

  constructor(private client: SupabaseRestClient, private currentUser: () => User | null) {}

  getCallState(): CallState {
    return {
      channelId: this.channelId,
      guildId: this.guildId,
      participants: this.participants,
      activeScreenShareUserId: null,
      startedAt: this.startedAt,
    };
  }

  onCallStateUpdated(callback: (state: CallState) => void): () => void {
    this.listeners.add(callback);
    return () => { this.listeners.delete(callback); };
  }

  private emit(): void {
    const state = this.getCallState();
    for (const listener of this.listeners) listener(state);
  }

  private me(): string {
    const user = this.currentUser();
    if (!user) throw new Error('Sessão expirada.');
    return user.id;
  }

  async joinCall(channelId: string, guildId: string, _userId: string, displayName: string): Promise<boolean> {
    if (this.channelId === channelId) return true;
    if (this.channelId) await this.leaveCall(this.me());
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('Microfone indisponível neste navegador.');
    this.local = await navigator.mediaDevices.getUserMedia({
      audio: this.inputDeviceId === 'default' ? true : { deviceId: { exact: this.inputDeviceId } },
    });
    const me = this.me();
    // Upsert do próprio estado; o RLS recusa canal sem CONNECT ou que não seja de voz.
    await this.client.rest('DELETE', `/voice_states?user_id=eq.${me}`, undefined, false);
    await this.client.rest('POST', '/voice_states', {
      user_id: me, channel_id: channelId, display_name: displayName.slice(0, 64),
      is_muted: this.muted, is_deafened: this.deafened,
    }, false).catch(error => { this.stopLocal(); throw error; });
    this.channelId = channelId;
    this.guildId = guildId;
    this.startedAt = Date.now();
    this.timers.push(setInterval(() => { void this.poll(); }, POLL_MS));
    this.timers.push(setInterval(() => { void this.heartbeat(); }, HEARTBEAT_MS));
    await this.poll();
    return true;
  }

  async leaveCall(_userId: string): Promise<void> {
    const channelId = this.channelId;
    for (const timer of this.timers) clearInterval(timer);
    this.timers = [];
    if (channelId) {
      const me = this.me();
      await Promise.allSettled([...this.peers.keys()].map(to => this.signal(to, 'bye', {})));
      await this.client.rest('DELETE', `/voice_states?user_id=eq.${me}`, undefined, false).catch(() => {});
    }
    for (const id of [...this.peers.keys()]) this.closePeer(id);
    this.stopLocal();
    this.channelId = null;
    this.guildId = null;
    this.startedAt = null;
    this.participants = [];
    this.emit();
  }

  private stopLocal(): void {
    for (const track of this.local?.getTracks() ?? []) track.stop();
    this.local = null;
  }

  private async heartbeat(): Promise<void> {
    if (!this.channelId) return;
    await this.client.rest('PATCH', `/voice_states?user_id=eq.${this.me()}`, {
      updated_at: new Date().toISOString(), is_muted: this.muted, is_deafened: this.deafened,
    }, false).catch(() => {});
  }

  private async poll(): Promise<void> {
    if (!this.channelId || this.polling) return;
    this.polling = true;
    try {
      const me = this.me();
      const rows = await this.client.rest<VoiceStateRow[]>('GET',
        `/voice_states?channel_id=eq.${this.channelId}&select=*&order=joined_at.asc`);
      const present = (rows ?? []).filter(r => r.user_id === me || isFresh(r.updated_at));
      this.participants = present.map(r => ({
        userId: r.user_id, displayName: r.display_name, isMuted: r.is_muted,
        isDeafened: r.is_deafened, isScreenSharing: false, joinedAt: Date.parse(r.joined_at),
      }));
      const others = new Set(present.map(r => r.user_id).filter(id => id !== me));
      for (const id of [...this.peers.keys()]) if (!others.has(id)) this.closePeer(id);
      for (const id of others) {
        if (!this.peers.has(id) && shouldInitiate(me, id)) await this.startOffer(id);
      }
      const signals = await this.client.rest<SignalRow[]>('GET',
        `/voice_signals?to_id=eq.${me}&channel_id=eq.${this.channelId}&select=id,from_id,kind,payload&order=created_at.asc`);
      for (const signal of signals ?? []) {
        await this.handleSignal(signal).catch(error => console.warn('Sinal de voz ignorado:', error));
      }
      if (signals?.length) {
        await this.client.rest('DELETE', `/voice_signals?id=in.(${signals.map(s => s.id).join(',')})`, undefined, false);
      }
      this.emit();
    } catch (error) {
      console.warn('Falha ao sincronizar voz:', error);
    } finally {
      this.polling = false;
    }
  }

  private signal(to: string, kind: SignalRow['kind'], payload: SignalRow['payload']): Promise<unknown> {
    return this.client.rest('POST', '/voice_signals', {
      channel_id: this.channelId, from_id: this.me(), to_id: to, kind, payload,
    }, false);
  }

  private createPeer(otherId: string): RTCPeerConnection {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    for (const track of this.local?.getTracks() ?? []) pc.addTrack(track, this.local!);
    pc.onicecandidate = event => {
      if (event.candidate) void this.signal(otherId, 'ice', { candidate: event.candidate.toJSON() });
    };
    pc.ontrack = event => {
      let audio = this.audios.get(otherId);
      if (!audio) {
        audio = new Audio();
        audio.autoplay = true;
        this.audios.set(otherId, audio);
      }
      audio.srcObject = event.streams[0];
      audio.muted = this.deafened;
      const sink = audio as HTMLAudioElement & { setSinkId?: (id: string) => Promise<void> };
      if (this.outputDeviceId !== 'default') void sink.setSinkId?.(this.outputDeviceId);
      void audio.play().catch(() => {});
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed') this.closePeer(otherId);
    };
    this.peers.set(otherId, pc);
    return pc;
  }

  private async startOffer(otherId: string): Promise<void> {
    const pc = this.createPeer(otherId);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await this.signal(otherId, 'offer', { sdp: offer.sdp, type: offer.type });
  }

  private async handleSignal(signal: SignalRow): Promise<void> {
    const from = signal.from_id;
    if (signal.kind === 'bye') { this.closePeer(from); return; }
    if (signal.kind === 'offer') {
      this.closePeer(from);
      const pc = this.createPeer(from);
      await pc.setRemoteDescription({ type: 'offer', sdp: signal.payload.sdp });
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await this.signal(from, 'answer', { sdp: answer.sdp, type: answer.type });
      return;
    }
    const pc = this.peers.get(from);
    if (!pc) return;
    if (signal.kind === 'answer' && pc.signalingState === 'have-local-offer') {
      await pc.setRemoteDescription({ type: 'answer', sdp: signal.payload.sdp });
    } else if (signal.kind === 'ice' && signal.payload.candidate) {
      await pc.addIceCandidate(signal.payload.candidate);
    }
  }

  private closePeer(otherId: string): void {
    this.peers.get(otherId)?.close();
    this.peers.delete(otherId);
    const audio = this.audios.get(otherId);
    if (audio) { audio.srcObject = null; this.audios.delete(otherId); }
  }

  async setMute(_userId: string, isMuted: boolean): Promise<void> {
    this.muted = isMuted;
    for (const track of this.local?.getAudioTracks() ?? []) track.enabled = !isMuted;
    await this.heartbeat();
    await this.poll();
  }

  async setDeafen(_userId: string, isDeafened: boolean): Promise<void> {
    this.deafened = isDeafened;
    for (const audio of this.audios.values()) audio.muted = isDeafened;
    if (isDeafened) await this.setMute(_userId, true);
    else { await this.heartbeat(); await this.poll(); }
  }

  async startScreenShare(): Promise<boolean> {
    return false; // Fora do escopo desta fase: só áudio.
  }

  async stopScreenShare(): Promise<void> {}

  async kickParticipant(): Promise<boolean> {
    return false; // Expulsar exige política de servidor; ainda não implementado.
  }

  async getAudioDevices(): Promise<AudioDevice[]> {
    const devices = await navigator.mediaDevices?.enumerateDevices?.() ?? [];
    return devices
      .filter((d): d is MediaDeviceInfo & { kind: 'audioinput' | 'audiooutput' } => d.kind === 'audioinput' || d.kind === 'audiooutput')
      .map(d => ({ deviceId: d.deviceId, label: d.label || (d.kind === 'audioinput' ? 'Microfone' : 'Alto-falante'), kind: d.kind }));
  }

  async setAudioDevice(kind: 'audioinput' | 'audiooutput', deviceId: string): Promise<void> {
    if (kind === 'audioinput') this.inputDeviceId = deviceId;
    else {
      this.outputDeviceId = deviceId;
      for (const audio of this.audios.values()) {
        void (audio as HTMLAudioElement & { setSinkId?: (id: string) => Promise<void> }).setSinkId?.(deviceId);
      }
    }
  }

  async setSpeaking(): Promise<void> {}

  async triggerEmergencyBudgetCutoff(): Promise<void> {
    if (this.channelId) await this.leaveCall(this.me());
  }
}
