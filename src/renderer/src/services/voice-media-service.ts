/**
 * VoiceMediaService: Gerenciador de Áudio, Microfone Real e Transmissão de Tela
 * Baseado na arquitetura nativa do Discord (WebRTC MediaStreams + Web Audio API).
 * 
 * Evidências de Engenharia Reversa REA (core.asar ev_d02135610abe10845e82aacb4f03dbf53668bbfb3099e053b2c01e7fdc64a63f):
 * - navigator.mediaDevices.getUserMedia({ audio: true }) para captura do microfone.
 * - navigator.mediaDevices.getDisplayMedia({ video: true, audio: true }) para captura de tela ao vivo.
 * - AnalyserNode da Web Audio API para detecção de voz (Voice Activity Detection / speaking ring).
 * - Desligamento gracioso de tracks (track.stop()) ao encerrar chamadas ou transmissões.
 */

export class VoiceMediaService {
  private micStream: MediaStream | null = null;
  private screenStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private vadIntervalId: any = null;
  private isSpeaking = false;
  private lastAboveThresholdTime = 0;
  private onSpeakingChangeCallback?: (isSpeaking: boolean) => void;

  /**
   * Inicia a captura real do microfone e a detecção de atividade de voz (VAD)
   */
  public async startMicrophone(onSpeakingChange?: (isSpeaking: boolean) => void): Promise<MediaStream | null> {
    this.onSpeakingChangeCallback = onSpeakingChange;

    if (typeof window === 'undefined' || !navigator?.mediaDevices?.getUserMedia) {
      return null;
    }

    try {
      // 1. Obtém stream real do microfone
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false
      });
      this.micStream = stream;

      // 2. Configura AudioContext e AnalyserNode para Voice Activity Detection
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioContext = new AudioCtxClass();
        if (this.audioContext.state === 'suspended') {
          await this.audioContext.resume();
        }

        const source = this.audioContext.createMediaStreamSource(stream);
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 256;
        this.analyser.smoothingTimeConstant = 0.3;
        // Conecta a fonte apenas ao AnalyserNode (sem conectar ao destination para evitar microfonia local)
        source.connect(this.analyser);

        // 3. Loop de detecção de fala (RMS de volume)
        this.startVoiceActivityDetection();
      }

      return stream;
    } catch (err) {
      console.warn('Microfone real não pôde ser iniciado ou permissão foi negada:', err);
      return null;
    }
  }

  /**
   * Monitora em tempo real se o usuário está falando
   */
  private startVoiceActivityDetection(): void {
    if (this.vadIntervalId) {
      clearInterval(this.vadIntervalId);
    }

    const dataArray = new Uint8Array(this.analyser ? this.analyser.frequencyBinCount : 0);
    const THRESHOLD = 14; // Limiar de sensibilidade do microfone (0 a 255)
    const HANGOVER_MS = 350; // Tempo de persistência do anel verde (Discord gate)

    this.vadIntervalId = setInterval(() => {
      if (!this.analyser || !this.micStream) return;

      const audioTracks = this.micStream.getAudioTracks();
      const isMuted = audioTracks.length === 0 || !audioTracks[0].enabled;

      if (isMuted) {
        if (this.isSpeaking) {
          this.isSpeaking = false;
          this.onSpeakingChangeCallback?.(false);
        }
        return;
      }

      this.analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const average = sum / (dataArray.length || 1);
      const now = Date.now();

      if (average > THRESHOLD) {
        this.lastAboveThresholdTime = now;
        if (!this.isSpeaking) {
          this.isSpeaking = true;
          this.onSpeakingChangeCallback?.(true);
        }
      } else {
        if (this.isSpeaking && now - this.lastAboveThresholdTime > HANGOVER_MS) {
          this.isSpeaking = false;
          this.onSpeakingChangeCallback?.(false);
        }
      }
    }, 50);
  }

  /**
   * Ativa ou silencia o microfone
   */
  public setMute(isMuted: boolean): void {
    if (this.micStream) {
      this.micStream.getAudioTracks().forEach((track) => {
        track.enabled = !isMuted;
      });
    }
    if (isMuted && this.isSpeaking) {
      this.isSpeaking = false;
      this.onSpeakingChangeCallback?.(false);
    }
  }

  /**
   * Para a captura do microfone e libera hardware e AudioContext
   */
  public stopMicrophone(): void {
    if (this.vadIntervalId) {
      clearInterval(this.vadIntervalId);
      this.vadIntervalId = null;
    }

    if (this.micStream) {
      this.micStream.getTracks().forEach((track) => track.stop());
      this.micStream = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        this.audioContext.close();
      } catch {
        // Ignora erros ao fechar contexto
      }
      this.audioContext = null;
    }

    if (this.isSpeaking) {
      this.isSpeaking = false;
      this.onSpeakingChangeCallback?.(false);
    }
  }

  /**
   * Inicia o compartilhamento de tela real via getDisplayMedia
   */
  public async startScreenShare(onEnded?: () => void): Promise<MediaStream | null> {
    if (typeof window === 'undefined' || !navigator?.mediaDevices?.getDisplayMedia) {
      return null;
    }

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: 'always'
        } as any,
        audio: true
      });

      this.screenStream = stream;

      // Escuta o encerramento do compartilhamento pelo banner nativo do sistema/navegador
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.addEventListener('ended', () => {
          this.stopScreenShare();
          onEnded?.();
        });
      }

      return stream;
    } catch (err) {
      console.warn('Compartilhamento de tela cancelado ou não permitido:', err);
      return null;
    }
  }

  /**
   * Encerra a transmissão de tela e para todas as tracks
   */
  public stopScreenShare(): void {
    if (this.screenStream) {
      this.screenStream.getTracks().forEach((track) => track.stop());
      this.screenStream = null;
    }
  }

  public getScreenStream(): MediaStream | null {
    return this.screenStream;
  }

  public getMicStream(): MediaStream | null {
    return this.micStream;
  }
}

export const voiceMediaService = new VoiceMediaService();
