import { afterEach, describe, expect, it, vi } from 'vitest';
import { SupabaseCallController, isFresh, shouldInitiate } from '../../src/renderer/src/services/supabase-voice';

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('voz Supabase', () => {
  it('só um lado inicia a oferta e estados velhos são ignorados', () => {
    expect(shouldInitiate('a', 'b')).toBe(true);
    expect(shouldInitiate('b', 'a')).toBe(false);
    const now = Date.parse('2026-10-26T10:00:30Z');
    expect(isFresh('2026-10-26T10:00:20Z', now)).toBe(true);
    expect(isFresh('2026-10-26T10:00:00Z', now)).toBe(false);
  });

  it('entra com o próprio id da sessão, lista participantes e sai limpando o estado', async () => {
    vi.useFakeTimers();
    const stop = vi.fn();
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: vi.fn(async () => ({ getTracks: () => [{ stop }], getAudioTracks: () => [] })) } });
    const calls: { method: string; path: string; body?: any }[] = [];
    const client = {
      rest: vi.fn(async (method: string, path: string, body?: unknown) => {
        calls.push({ method, path, body });
        if (method === 'GET' && path.startsWith('/voice_states')) {
          return [{ user_id: 'me', channel_id: 'vc', display_name: 'Eu', is_muted: false, is_deafened: false,
            joined_at: new Date().toISOString(), updated_at: new Date().toISOString() }];
        }
        return [];
      }),
    };
    const voice = new SupabaseCallController(client as any, () => ({ id: 'me', username: 'eu', displayName: 'Eu' }));
    expect(await voice.joinCall('vc', 'g', 'forjado', 'Eu')).toBe(true);
    const insert = calls.find(c => c.method === 'POST' && c.path === '/voice_states');
    expect(insert?.body.user_id).toBe('me');
    expect(voice.getCallState().participants.map(p => p.userId)).toEqual(['me']);
    await voice.leaveCall('me');
    expect(calls.some(c => c.method === 'DELETE' && c.path === '/voice_states?user_id=eq.me')).toBe(true);
    expect(stop).toHaveBeenCalled();
    expect(voice.getCallState().channelId).toBeNull();
  });

  it('para o microfone, fecha peers e limpa o estado ao sair mesmo se a sessão tiver expirado', async () => {
    vi.useFakeTimers();
    const stop = vi.fn();
    const closePeer = vi.fn();
    vi.stubGlobal('navigator', {
      mediaDevices: {
        getUserMedia: vi.fn(async () => ({
          getTracks: () => [{ stop }],
          getAudioTracks: () => [{ enabled: true }],
        })),
      },
    });
    vi.stubGlobal(
      'RTCPeerConnection',
      vi.fn(() => ({
        addTrack: vi.fn(),
        addTransceiver: vi.fn(),
        getTransceivers: vi.fn(() => []),
        createOffer: vi.fn(async () => ({ type: 'offer', sdp: 'v=0' })),
        setLocalDescription: vi.fn(async () => {}),
        close: closePeer,
      })),
    );

    let sessionActive = true;
    const nowIso = new Date().toISOString();
    const client = {
      rest: vi.fn(async (method: string, path: string) => {
        if (method === 'GET' && path.startsWith('/voice_states')) {
          return [
            {
              user_id: 'a-me',
              channel_id: 'vc',
              display_name: 'Eu',
              is_muted: false,
              is_deafened: false,
              joined_at: nowIso,
              updated_at: nowIso,
            },
            {
              user_id: 'b-peer',
              channel_id: 'vc',
              display_name: 'Outro',
              is_muted: false,
              is_deafened: false,
              joined_at: nowIso,
              updated_at: nowIso,
            },
          ];
        }
        return [];
      }),
    };

    const voice = new SupabaseCallController(client as any, () =>
      sessionActive ? { id: 'a-me', username: 'eu', displayName: 'Eu' } : null,
    );

    await voice.joinCall('vc', 'g', 'a-me', 'Eu');
    sessionActive = false;

    await expect(voice.triggerEmergencyBudgetCutoff()).resolves.toBeUndefined();
    expect(stop).toHaveBeenCalledTimes(1);
    expect(closePeer).toHaveBeenCalledTimes(1);
    expect(voice.getCallState().channelId).toBeNull();
    expect(voice.getCallState().participants).toEqual([]);
  });

  it('remove peer órfão quando o envio da oferta falha e tenta novamente no próximo poll', async () => {
    vi.useFakeTimers();
    const stop = vi.fn();
    const closePeer = vi.fn();
    const createOffer = vi.fn(async () => ({ type: 'offer', sdp: 'v=0-offer' }));
    vi.stubGlobal('navigator', {
      mediaDevices: {
        getUserMedia: vi.fn(async () => ({
          getTracks: () => [{ stop }],
          getAudioTracks: () => [{ enabled: true }],
        })),
      },
    });
    vi.stubGlobal(
      'RTCPeerConnection',
      vi.fn(() => ({
        addTrack: vi.fn(),
        addTransceiver: vi.fn(),
        getTransceivers: vi.fn(() => []),
        createOffer,
        setLocalDescription: vi.fn(async () => {}),
        close: closePeer,
      })),
    );

    let failOfferSignal = true;
    const nowIso = new Date().toISOString();
    const client = {
      rest: vi.fn(async (method: string, path: string, body?: any) => {
        if (method === 'GET' && path.startsWith('/voice_states')) {
          return [
            {
              user_id: 'a-me',
              channel_id: 'vc',
              display_name: 'Eu',
              is_muted: false,
              is_deafened: false,
              joined_at: nowIso,
              updated_at: nowIso,
            },
            {
              user_id: 'b-peer',
              channel_id: 'vc',
              display_name: 'Outro',
              is_muted: false,
              is_deafened: false,
              joined_at: nowIso,
              updated_at: nowIso,
            },
          ];
        }
        if (method === 'POST' && path === '/voice_signals' && body?.kind === 'offer' && failOfferSignal) {
          throw new Error('Falha temporária de rede');
        }
        return [];
      }),
    };

    const voice = new SupabaseCallController(client as any, () => ({
      id: 'a-me',
      username: 'eu',
      displayName: 'Eu',
    }));

    await voice.joinCall('vc', 'g', 'a-me', 'Eu');
    expect(createOffer).toHaveBeenCalledTimes(1);
    expect(closePeer).toHaveBeenCalledTimes(1);

    failOfferSignal = false;
    await vi.advanceTimersByTimeAsync(1000);
    expect(createOffer).toHaveBeenCalledTimes(2);
    await voice.leaveCall('a-me');
  });

  it('processa offer/ice/bye recebidos, aplica mute/deafen e limpa peer se resposta a offer falhar', async () => {
    vi.useFakeTimers();
    const audioTrack = { enabled: true };
    const stop = vi.fn();
    const closePeer = vi.fn();
    const setRemoteDescription = vi.fn(async () => {});
    const createAnswer = vi.fn(async () => ({ type: 'answer', sdp: 'v=0-answer' }));
    const setLocalDescription = vi.fn(async () => {});
    const addIceCandidate = vi.fn(async () => {});

    vi.stubGlobal('navigator', {
      mediaDevices: {
        getUserMedia: vi.fn(async () => ({
          getTracks: () => [{ stop }],
          getAudioTracks: () => [audioTrack],
        })),
      },
    });
    vi.stubGlobal(
      'RTCPeerConnection',
      vi.fn(() => ({
        signalingState: 'stable',
        addTrack: vi.fn(),
        addTransceiver: vi.fn(),
        getTransceivers: vi.fn(() => []),
        setRemoteDescription,
        createAnswer,
        setLocalDescription,
        addIceCandidate,
        close: closePeer,
      })),
    );

    const nowIso = new Date().toISOString();
    let queuedSignals: any[] = [
      { id: 'sig-1', from_id: 'a-initiator', kind: 'offer', payload: { type: 'offer', sdp: 'v=0-bad' } },
    ];
    let failAnswerPost = true;
    const calls: { method: string; path: string; body?: any }[] = [];

    const client = {
      rest: vi.fn(async (method: string, path: string, body?: any) => {
        calls.push({ method, path, body });
        if (method === 'GET' && path.startsWith('/voice_states')) {
          return [
            {
              user_id: 'z-receiver',
              channel_id: 'vc',
              display_name: 'Receptor',
              is_muted: !audioTrack.enabled,
              is_deafened: false,
              joined_at: nowIso,
              updated_at: nowIso,
            },
            {
              user_id: 'a-initiator',
              channel_id: 'vc',
              display_name: 'Iniciador',
              is_muted: false,
              is_deafened: false,
              joined_at: nowIso,
              updated_at: nowIso,
            },
          ];
        }
        if (method === 'GET' && path.startsWith('/voice_signals')) {
          const current = queuedSignals;
          queuedSignals = [];
          return current;
        }
        if (method === 'POST' && path === '/voice_signals' && body?.kind === 'answer' && failAnswerPost) {
          throw new Error('Falha ao enviar answer');
        }
        return [];
      }),
    };

    const voice = new SupabaseCallController(client as any, () => ({
      id: 'z-receiver',
      username: 'rec',
      displayName: 'Receptor',
    }));

    // Primeira rodada: offer recebida falha ao enviar answer -> peer deve ser fechado
    await voice.joinCall('vc', 'g', 'z-receiver', 'Receptor');
    expect(closePeer).toHaveBeenCalledTimes(1);

    // Segunda rodada: offer válida + ice + bye
    failAnswerPost = false;
    queuedSignals = [
      { id: 'sig-2', from_id: 'a-initiator', kind: 'offer', payload: { type: 'offer', sdp: 'v=0-offer' } },
      { id: 'sig-3', from_id: 'a-initiator', kind: 'ice', payload: { candidate: { candidate: 'cand-1' } } },
    ];
    await vi.advanceTimersByTimeAsync(1000);
    expect(setRemoteDescription).toHaveBeenCalledWith({ type: 'offer', sdp: 'v=0-offer' });
    expect(addIceCandidate).toHaveBeenCalledWith({ candidate: 'cand-1' });
    expect(calls.some(c => c.method === 'POST' && c.path === '/voice_signals' && c.body?.kind === 'answer')).toBe(true);
    expect(calls.some(c => c.method === 'DELETE' && c.path === '/voice_signals?id=in.(sig-2,sig-3)')).toBe(true);

    // setDeafen(true) também ativa mute na trilha local
    await voice.setDeafen('z-receiver', true);
    expect(audioTrack.enabled).toBe(false);

    // Sinal bye fecha o peer ativo
    queuedSignals = [{ id: 'sig-4', from_id: 'a-initiator', kind: 'bye', payload: {} }];
    await vi.advanceTimersByTimeAsync(1000);
    expect(closePeer).toHaveBeenCalledTimes(2);

    await voice.leaveCall('z-receiver');
  });
});
