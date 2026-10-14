import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { VoiceMediaService } from '../../src/renderer/src/services/voice-media-service';

describe('VoiceMediaService - Captura Real de Microfone, VAD e Transmissão de Tela (Etapa 12)', () => {
  let service: VoiceMediaService;

  beforeEach(() => {
    service = new VoiceMediaService();
  });

  afterEach(() => {
    service.stopMicrophone();
    service.stopScreenShare();
    vi.restoreAllMocks();
  });

  it('inicializa e lida graciosamente quando navigator.mediaDevices não está presente (ex: ambiente Node)', async () => {
    const originalNavigator = globalThis.navigator;
    // @ts-ignore
    delete globalThis.navigator;

    const micStream = await service.startMicrophone();
    const screenStream = await service.startScreenShare();

    expect(micStream).toBeNull();
    expect(screenStream).toBeNull();

    // Restaura navigator
    globalThis.navigator = originalNavigator;
  });

  it('inicia captura do microfone, ativa VAD e desliga tracks graciosamente ao encerrar', async () => {
    const mockTrack = {
      kind: 'audio',
      enabled: true,
      stop: vi.fn(),
      addEventListener: vi.fn()
    };
    const mockStream = {
      getAudioTracks: () => [mockTrack],
      getTracks: () => [mockTrack]
    };

    const mockAnalyser = {
      fftSize: 256,
      smoothingTimeConstant: 0.3,
      frequencyBinCount: 128,
      getByteFrequencyData: vi.fn((arr: Uint8Array) => {
        // Simula som alto (fala detectada > 14)
        arr.fill(40);
      })
    };

    const mockSource = {
      connect: vi.fn()
    };

    const mockAudioContext = {
      state: 'running',
      createMediaStreamSource: vi.fn(() => mockSource),
      createAnalyser: vi.fn(() => mockAnalyser),
      resume: vi.fn(),
      close: vi.fn()
    };

    // Configura mocks no ambiente global
    // @ts-ignore
    globalThis.navigator = {
      mediaDevices: {
        getUserMedia: vi.fn().mockResolvedValue(mockStream),
        getDisplayMedia: vi.fn()
      } as any
    } as any;

    // @ts-ignore
    globalThis.window = {
      AudioContext: vi.fn().mockImplementation(() => mockAudioContext)
    };

    const onSpeakingChange = vi.fn();
    const stream = await service.startMicrophone(onSpeakingChange);

    expect(stream).toBe(mockStream);
    expect(globalThis.navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      },
      video: false
    });
    expect(mockSource.connect).toHaveBeenCalledWith(mockAnalyser);

    // Testa mutar microfone
    service.setMute(true);
    expect(mockTrack.enabled).toBe(false);

    // Testa desmutar microfone
    service.setMute(false);
    expect(mockTrack.enabled).toBe(true);

    // Encerra captura
    service.stopMicrophone();
    expect(mockTrack.stop).toHaveBeenCalled();
    expect(mockAudioContext.close).toHaveBeenCalled();
  });

  it('inicia compartilhamento de tela com getDisplayMedia e encerra ao disparar track ended', async () => {
    let onEndedListener: (() => void) | undefined;
    const mockVideoTrack = {
      kind: 'video',
      stop: vi.fn(),
      addEventListener: vi.fn((event: string, callback: () => void) => {
        if (event === 'ended') {
          onEndedListener = callback;
        }
      })
    };
    const mockScreenStream = {
      getVideoTracks: () => [mockVideoTrack],
      getTracks: () => [mockVideoTrack]
    };

    // @ts-ignore
    globalThis.navigator = {
      mediaDevices: {
        getUserMedia: vi.fn(),
        getDisplayMedia: vi.fn().mockResolvedValue(mockScreenStream)
      } as any
    } as any;


    const onEnded = vi.fn();
    const stream = await service.startScreenShare(onEnded);

    expect(stream).toBe(mockScreenStream);
    expect(globalThis.navigator.mediaDevices.getDisplayMedia).toHaveBeenCalledWith({
      video: { cursor: 'always' },
      audio: true
    });

    // Simula usuário clicando em "Interromper compartilhamento" no banner do navegador
    expect(onEndedListener).toBeDefined();
    onEndedListener!();

    expect(onEnded).toHaveBeenCalled();
    expect(mockVideoTrack.stop).toHaveBeenCalled();
    expect(service.getScreenStream()).toBeNull();
  });
});
