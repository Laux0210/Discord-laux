import mqtt, { type MqttClient } from 'mqtt';
import Peer from 'peerjs';
import type { User, Message } from '../../../common/types';
import type { DesktopChatService } from './desktop-chat-service';
import type { InMemoryPresenceService } from './presence-service';
import { voiceMediaService } from './voice-media-service';

import type { CallController } from '../../../common/media-types';

export interface RealtimeConfig {
  mqttBrokerUrl?: string;
}

export class RealtimeNetworkService {
  private mqttClient: MqttClient | null = null;
  private peer: any | null = null;
  private peerId: string | null = null;
  private currentUser: User | null = null;
  private chatService: DesktopChatService | any = null;
  private callController: CallController | any = null;
  private presenceService: InMemoryPresenceService | any = null;

  private currentVoiceChannelId: string | null = null;
  private activeCalls: Map<string, any> = new Map(); // peerId -> MediaConnection
  private remoteAudioElements: Map<string, HTMLAudioElement> = new Map();
  private remoteScreenCallbacks: Set<(stream: MediaStream | null, userId: string) => void> = new Set();

  /**
   * Inicializa o serviço de rede em tempo real
   */
  public init(
    user: User,
    chatService: DesktopChatService | any,
    callController: CallController | any,
    presenceService: InMemoryPresenceService | any,
    config?: RealtimeConfig
  ): void {
    this.currentUser = user;
    this.chatService = chatService;
    this.callController = callController;
    this.presenceService = presenceService;

    if (typeof window === 'undefined') return;

    // 1. Inicializa PeerJS para WebRTC P2P (Áudio e Vídeo)
    this.initPeer(user);

    // 2. Conecta ao broker MQTT público (WSS) para sinalização e bate-papo em tempo real
    const brokerUrl = config?.mqttBrokerUrl || 'wss://broker.emqx.io:8084/mqtt';
    this.initMqtt(user, brokerUrl);
  }

  private initPeer(user: User): void {
    try {
      const PeerConstructor = (Peer as any).Peer || Peer;
      // Gera ID de peer único determinístico para o usuário
      const randomSuffix = Math.random().toString(36).substring(2, 6);
      this.peerId = `laux-${user.id}-${randomSuffix}`;

      this.peer = new PeerConstructor(this.peerId, {
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
          ]
        }
      });

      this.peer.on('open', (id: string) => {
        this.peerId = id;
        console.log('[Realtime] PeerJS conectado com ID:', id);
      });

      this.peer.on('call', (mediaConnection: any) => {
        console.log('[Realtime] Chamada recebida de:', mediaConnection.peer);
        // Responde com o microfone local (se conectado em call)
        const localMic = voiceMediaService.getMicStream();
        mediaConnection.answer(localMic || undefined);

        mediaConnection.on('stream', (remoteStream: MediaStream) => {
          this.handleRemoteStream(mediaConnection.peer, remoteStream);
        });

        mediaConnection.on('close', () => {
          this.cleanupRemoteStream(mediaConnection.peer);
        });

        this.activeCalls.set(mediaConnection.peer, mediaConnection);
      });

      this.peer.on('error', (err: any) => {
        console.warn('[Realtime] Alerta PeerJS (esperado em modo offline):', err.message || err);
      });
    } catch (e) {
      console.warn('[Realtime] Não foi possível inicializar PeerJS:', e);
    }
  }

  private initMqtt(user: User, brokerUrl: string): void {
    try {
      const clientId = `laux_client_${user.id}_${Math.random().toString(36).substring(2, 8)}`;
      this.mqttClient = mqtt.connect(brokerUrl, {
        clientId,
        clean: true,
        connectTimeout: 8000,
        reconnectPeriod: 5000
      });

      this.mqttClient.on('connect', () => {
        console.log('[Realtime] Conectado ao broker MQTT com sucesso');

        // Inscreve nos tópicos de chat global, chamadas e presença
        this.mqttClient?.subscribe('discord-laux/chat/#');
        this.mqttClient?.subscribe('discord-laux/voice/#');
        this.mqttClient?.subscribe('discord-laux/presence');

        // Anuncia presença online
        this.publish('discord-laux/presence', {
          type: 'USER_ONLINE',
          user: {
            id: user.id,
            username: user.username,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl
          },
          peerId: this.peerId
        });
      });

      this.mqttClient.on('message', (topic: string, messageBuffer: Buffer) => {
        try {
          const payload = JSON.parse(messageBuffer.toString());
          this.handleIncomingMqttMessage(topic, payload);
        } catch {
          // Ignora mensagens malformadas
        }
      });

      this.mqttClient.on('error', (err) => {
        console.warn('[Realtime] Alerta MQTT:', err);
      });
    } catch (e) {
      console.warn('[Realtime] Não foi possível conectar ao broker MQTT:', e);
    }
  }

  private publish(topic: string, data: any): void {
    if (this.mqttClient && this.mqttClient.connected) {
      this.mqttClient.publish(topic, JSON.stringify(data));
    }
  }

  private handleIncomingMqttMessage(topic: string, payload: any): void {
    if (!payload || !payload.type) return;

    // Ignora mensagens emitidas por este próprio cliente se tiver o mesmo peerId
    if (payload.peerId && payload.peerId === this.peerId) {
      return;
    }

    if (topic.startsWith('discord-laux/chat/')) {
      if (payload.type === 'NEW_CHAT_MESSAGE' && payload.message) {
        // Se a mensagem veio de outro usuário/aparelho, injeta no chat local
        if (payload.message.authorId !== this.currentUser?.id) {
          this.chatService?.receiveRemoteMessage(payload.message);
        }
      }
    } else if (topic.startsWith('discord-laux/voice/')) {
      this.handleVoiceSignal(payload);
    } else if (topic === 'discord-laux/presence') {
      if (payload.type === 'USER_ONLINE' && payload.user) {
        this.presenceService?.setPresence(payload.user.id, 'online');
      }
    }
  }

  private handleVoiceSignal(payload: any): void {
    if (!this.callController) return;

    if (payload.type === 'VOICE_JOIN') {
      const { channelId, guildId, user, peerId } = payload;
      console.log(`[Realtime] Usuário ${user.displayName} entrou na sala de voz ${channelId}`);

      // Atualiza o estado da chamada local para mostrar o participante na tela
      this.callController.joinCall(channelId, guildId || 'guild-1', user.id, user.displayName).catch(() => {});

      // Se este aparelho também estiver conectado na mesma sala de voz, liga para o novo participante
      if (this.currentVoiceChannelId === channelId && peerId && this.peer) {
        const localMic = voiceMediaService.getMicStream();
        const call = this.peer.call(peerId, localMic || undefined);
        if (call) {
          call.on('stream', (remoteStream: MediaStream) => {
            this.handleRemoteStream(peerId, remoteStream);
          });
          call.on('close', () => {
            this.cleanupRemoteStream(peerId);
          });
          this.activeCalls.set(peerId, call);
        }
      }
    } else if (payload.type === 'VOICE_LEAVE') {
      const { userId, peerId } = payload;
      this.callController.leaveCall(userId).catch(() => {});
      if (peerId) {
        this.cleanupRemoteStream(peerId);
      }
    } else if (payload.type === 'VOICE_SPEAKING') {
      const { userId, isSpeaking } = payload;
      this.callController.setSpeaking(userId, isSpeaking).catch(() => {});
    } else if (payload.type === 'SCREEN_SHARE_START') {
      const { userId } = payload;
      this.callController.startScreenShare(userId).catch(() => {});
    } else if (payload.type === 'SCREEN_SHARE_STOP') {
      const { userId } = payload;
      this.callController.stopScreenShare(userId).catch(() => {});
      for (const cb of this.remoteScreenCallbacks) {
        cb(null, userId);
      }
    }
  }

  /**
   * Conecta um stream de áudio ou vídeo remoto ao DOM
   */
  private handleRemoteStream(peerId: string, stream: MediaStream): void {
    console.log('[Realtime] Conectando stream de áudio remoto do peer:', peerId);

    // Verifica se possui track de vídeo (compartilhamento de tela)
    const hasVideo = stream.getVideoTracks().length > 0;
    if (hasVideo) {
      for (const cb of this.remoteScreenCallbacks) {
        cb(stream, peerId);
      }
    }

    // Cria/atualiza elemento de áudio invisível para ouvir a voz do outro aparelho
    let audioEl = this.remoteAudioElements.get(peerId);
    if (!audioEl) {
      audioEl = document.createElement('audio');
      audioEl.autoplay = true;
      (audioEl as any).playsInline = true;
      audioEl.style.display = 'none';
      document.body.appendChild(audioEl);
      this.remoteAudioElements.set(peerId, audioEl);
    }

    audioEl.srcObject = stream;
    audioEl.play().catch((e) => {
      console.warn('[Realtime] Autoplay bloqueado pelo navegador até interação:', e);
    });
  }

  private cleanupRemoteStream(peerId: string): void {
    const audioEl = this.remoteAudioElements.get(peerId);
    if (audioEl) {
      audioEl.pause();
      audioEl.srcObject = null;
      audioEl.remove();
      this.remoteAudioElements.delete(peerId);
    }
    const call = this.activeCalls.get(peerId);
    if (call) {
      call.close();
      this.activeCalls.delete(peerId);
    }
  }

  // --- Métodos Públicos de Disparo de Ações ---

  /**
   * Envia mensagem de chat para outros aparelhos via MQTT
   */
  public broadcastChatMessage(channelId: string, message: Message): void {
    this.publish(`discord-laux/chat/${channelId}`, {
      type: 'NEW_CHAT_MESSAGE',
      peerId: this.peerId,
      message
    });
  }

  /**
   * Notifica outros aparelhos que este usuário entrou na sala de voz
   */
  public joinVoiceChannel(channelId: string, guildId: string, user: User): void {
    this.currentVoiceChannelId = channelId;
    this.publish(`discord-laux/voice/${channelId}`, {
      type: 'VOICE_JOIN',
      channelId,
      guildId,
      user: {
        id: user.id,
        displayName: user.displayName,
        username: user.username
      },
      peerId: this.peerId
    });
  }

  /**
   * Notifica outros aparelhos que este usuário saiu da sala de voz
   */
  public leaveVoiceChannel(channelId: string, userId: string): void {
    this.currentVoiceChannelId = null;
    this.publish(`discord-laux/voice/${channelId}`, {
      type: 'VOICE_LEAVE',
      channelId,
      userId,
      peerId: this.peerId
    });

    // Encerra todas as chamadas P2P ativas
    for (const [peerId, call] of this.activeCalls.entries()) {
      call.close();
      this.cleanupRemoteStream(peerId);
    }
    this.activeCalls.clear();
  }

  /**
   * Notifica se o usuário está falando
   */
  public broadcastSpeaking(channelId: string, userId: string, isSpeaking: boolean): void {
    this.publish(`discord-laux/voice/${channelId}`, {
      type: 'VOICE_SPEAKING',
      channelId,
      userId,
      isSpeaking,
      peerId: this.peerId
    });
  }

  /**
   * Notifica início de compartilhamento de tela
   */
  public broadcastScreenShareStart(channelId: string, userId: string, stream?: MediaStream): void {
    this.publish(`discord-laux/voice/${channelId}`, {
      type: 'SCREEN_SHARE_START',
      channelId,
      userId,
      peerId: this.peerId
    });

    // Transmite a stream de vídeo de tela para todas as conexões P2P ativas
    if (stream && this.peer) {
      for (const [remotePeerId] of this.activeCalls) {
        try {
          this.peer.call(remotePeerId, stream);
        } catch (e) {
          console.warn('[Realtime] Erro ao enviar tela para peer:', e);
        }
      }
    }
  }

  /**
   * Notifica encerramento de compartilhamento de tela
   */
  public broadcastScreenShareStop(channelId: string, userId: string): void {
    this.publish(`discord-laux/voice/${channelId}`, {
      type: 'SCREEN_SHARE_STOP',
      channelId,
      userId,
      peerId: this.peerId
    });
  }

  /**
   * Registra callback para receber streams de tela remota
   */
  public onRemoteScreenStream(callback: (stream: MediaStream | null, userId: string) => void): () => void {
    this.remoteScreenCallbacks.add(callback);
    return () => {
      this.remoteScreenCallbacks.delete(callback);
    };
  }

  public getPeerId(): string | null {
    return this.peerId;
  }
}

export const realtimeNetworkService = new RealtimeNetworkService();
