import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SoundEffectsService } from '../../src/renderer/src/services/sound-effects';

describe('SoundEffectsService (Web Audio API)', () => {
  let service: SoundEffectsService;
  let mockOscillator: any;
  let mockGain: any;
  let mockAudioContext: any;
  const originalAudioContext = (globalThis as any).AudioContext;

  beforeEach(() => {
    service = new SoundEffectsService();

    mockOscillator = {
      type: 'sine',
      frequency: { setValueAtTime: vi.fn() },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn()
    };

    mockGain = {
      gain: {
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn()
      },
      connect: vi.fn()
    };

    mockAudioContext = {
      state: 'running',
      currentTime: 10,
      destination: {},
      createOscillator: vi.fn(() => mockOscillator),
      createGain: vi.fn(() => mockGain),
      resume: vi.fn().mockResolvedValue(undefined)
    };

    (globalThis as any).AudioContext = vi.fn(() => mockAudioContext);
  });

  afterEach(() => {
    (globalThis as any).AudioContext = originalAudioContext;
    vi.restoreAllMocks();
  });

  it('reproduz efeito sonoro de mute com frequências descendentes', () => {
    service.playMute();
    expect(mockAudioContext.createOscillator).toHaveBeenCalledTimes(2);
    expect(mockOscillator.start).toHaveBeenCalledTimes(2);
    expect(mockOscillator.frequency.setValueAtTime).toHaveBeenNthCalledWith(1, 440, 10);
    expect(mockOscillator.frequency.setValueAtTime).toHaveBeenNthCalledWith(2, 330, expect.any(Number));
  });

  it('reproduz efeito sonoro de unmute com frequências ascendentes', () => {
    service.playUnmute();
    expect(mockAudioContext.createOscillator).toHaveBeenCalledTimes(2);
    expect(mockOscillator.frequency.setValueAtTime).toHaveBeenNthCalledWith(1, 330, 10);
    expect(mockOscillator.frequency.setValueAtTime).toHaveBeenNthCalledWith(2, 440, expect.any(Number));
  });

  it('reproduz efeito de ensurdecer (deafen) e desativar ensurdecer (undeafen)', () => {
    service.playDeafen();
    expect(mockAudioContext.createOscillator).toHaveBeenCalledTimes(2);

    vi.clearAllMocks();
    service.playUndeafen();
    expect(mockAudioContext.createOscillator).toHaveBeenCalledTimes(2);
  });

  it('reproduz arpeggio de início e encerramento de transmissão de tela', () => {
    service.playScreenShareStart();
    expect(mockAudioContext.createOscillator).toHaveBeenCalledTimes(3);

    vi.clearAllMocks();
    service.playScreenShareStop();
    expect(mockAudioContext.createOscillator).toHaveBeenCalledTimes(2);
  });

  it('reproduz chimes de conexão e desconexão de canal de voz', () => {
    service.playVoiceConnect();
    expect(mockAudioContext.createOscillator).toHaveBeenCalledTimes(3);

    vi.clearAllMocks();
    service.playVoiceDisconnect();
    expect(mockAudioContext.createOscillator).toHaveBeenCalledTimes(2);
  });

  it('não lança erro quando AudioContext não estiver disponível no ambiente', () => {
    delete (globalThis as any).AudioContext;
    const headlessService = new SoundEffectsService();
    expect(() => headlessService.playMute()).not.toThrow();
    expect(() => headlessService.playVoiceConnect()).not.toThrow();
  });
});
