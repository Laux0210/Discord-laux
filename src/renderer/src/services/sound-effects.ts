/**
 * Serviço de Efeitos Sonoros do Discord Desktop via Web Audio API.
 * Gera tons sintetizados fiéis aos efeitos de áudio do Discord (mute, unmute,
 * ensurdecer, tela e conexão/desconexão de voz), com custo R$0, zero dependências
 * e fallback seguro em ambientes de teste sem saída de áudio.
 */

export class SoundEffectsService {
  private audioCtx: AudioContext | null = null;

  private getContext(): AudioContext | null {
    const scope =
      typeof window !== 'undefined'
        ? (window as any)
        : typeof globalThis !== 'undefined'
          ? (globalThis as any)
          : null;
    if (!scope) return null;

    const AudioContextClass = scope.AudioContext || scope.webkitAudioContext;
    if (!AudioContextClass) return null;

    try {
      if (!this.audioCtx || this.audioCtx.state === 'closed') {
        this.audioCtx = new AudioContextClass();
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        void this.audioCtx.resume();
      }
      return this.audioCtx;
    } catch {
      return null;
    }
  }

  /**
   * Toca uma sequência de frequências senoidais com envelope suave de ganho.
   */
  private playTones(notes: Array<{ freq: number; duration: number }>, volume = 0.12): void {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      let currentTime = ctx.currentTime;

      for (const note of notes) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(note.freq, currentTime);

        // Envelope: ataque rápido e decaimento exponencial suave (anti-pop)
        gain.gain.setValueAtTime(0.0001, currentTime);
        gain.gain.exponentialRampToValueAtTime(volume, currentTime + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, currentTime + note.duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(currentTime);
        osc.stop(currentTime + note.duration);

        currentTime += note.duration;
      }
    } catch (err) {
      console.warn('Efeito sonoro não pôde ser reproduzido:', err);
    }
  }

  /** Som ao desativar o microfone (Mute: tom descendente característico do Discord) */
  public playMute(): void {
    this.playTones([
      { freq: 440, duration: 0.08 },
      { freq: 330, duration: 0.11 }
    ], 0.14);
  }

  /** Som ao reativar o microfone (Unmute: tom ascendente agradável) */
  public playUnmute(): void {
    this.playTones([
      { freq: 330, duration: 0.08 },
      { freq: 440, duration: 0.11 }
    ], 0.14);
  }

  /** Som ao ensurdecer o áudio (Deafen: tom descendente mais grave) */
  public playDeafen(): void {
    this.playTones([
      { freq: 370, duration: 0.09 },
      { freq: 245, duration: 0.13 }
    ], 0.15);
  }

  /** Som ao desativar ensurdecer (Undeafen: tom ascendente) */
  public playUndeafen(): void {
    this.playTones([
      { freq: 245, duration: 0.09 },
      { freq: 370, duration: 0.13 }
    ], 0.15);
  }

  /** Som ao iniciar transmissão de tela (Arpeggio brilhante estilo Discord) */
  public playScreenShareStart(): void {
    this.playTones([
      { freq: 523.25, duration: 0.07 }, // C5
      { freq: 659.25, duration: 0.07 }, // E5
      { freq: 783.99, duration: 0.12 }  // G5
    ], 0.12);
  }

  /** Som ao interromper transmissão de tela (Chime suave descendente) */
  public playScreenShareStop(): void {
    this.playTones([
      { freq: 783.99, duration: 0.08 },
      { freq: 523.25, duration: 0.12 }
    ], 0.12);
  }

  /** Som ao entrar em canal de voz (Discord Voice Connect Chime) */
  public playVoiceConnect(): void {
    this.playTones([
      { freq: 392.00, duration: 0.08 }, // G4
      { freq: 523.25, duration: 0.08 }, // C5
      { freq: 659.25, duration: 0.14 }  // E5
    ], 0.14);
  }

  /** Som ao desconectar de canal de voz (Discord Voice Disconnect Chime) */
  public playVoiceDisconnect(): void {
    this.playTones([
      { freq: 523.25, duration: 0.09 }, // C5
      { freq: 392.00, duration: 0.14 }  // G4
    ], 0.14);
  }
}

export const soundEffects = new SoundEffectsService();
