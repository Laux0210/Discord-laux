import { afterEach, describe, expect, it, vi } from 'vitest';
import { SupabaseCallController } from '../../src/renderer/src/services/supabase-voice';
import { createSupabaseMemberDirectory, ONLINE_WINDOW_MS } from '../../src/renderer/src/services/supabase-app-services';

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('tela compartilhada no Supabase', () => {
  it('troca a faixa de vídeo dos peers, marca is_screen_sharing e para ao encerrar', async () => {
    vi.useFakeTimers();
    const screenStop = vi.fn();
    const screenTrack = { kind: 'video', stop: screenStop, addEventListener: vi.fn() };
    const screen = { getTracks: () => [screenTrack], getVideoTracks: () => [screenTrack] };
    vi.stubGlobal('navigator', {
      mediaDevices: {
        getUserMedia: vi.fn(async () => ({ getTracks: () => [], getAudioTracks: () => [] })),
        getDisplayMedia: vi.fn(async () => screen),
      },
    });
    const replaceTrack = vi.fn(async () => {});
    vi.stubGlobal('RTCPeerConnection', vi.fn(() => ({
      addTrack: vi.fn(),
      addTransceiver: vi.fn(),
      getTransceivers: () => [{ receiver: { track: { kind: 'video' } }, sender: { replaceTrack } }],
      createOffer: vi.fn(async () => ({ type: 'offer', sdp: 'v=0' })),
      setLocalDescription: vi.fn(async () => {}),
      close: vi.fn(),
    })));
    const patches: any[] = [];
    let sharing = false;
    const nowIso = new Date().toISOString();
    const client = {
      rest: vi.fn(async (method: string, path: string, body?: any) => {
        if (method === 'PATCH') { patches.push(body); sharing = body.is_screen_sharing; }
        if (method === 'GET' && path.startsWith('/voice_states')) {
          return [
            { user_id: 'a-me', channel_id: 'vc', display_name: 'Eu', is_muted: false, is_deafened: false, is_screen_sharing: sharing, joined_at: nowIso, updated_at: nowIso },
            { user_id: 'b-peer', channel_id: 'vc', display_name: 'Outro', is_muted: false, is_deafened: false, joined_at: nowIso, updated_at: nowIso },
          ];
        }
        return [];
      }),
    };
    const voice = new SupabaseCallController(client as any, () => ({ id: 'a-me', username: 'eu', displayName: 'Eu' }));
    await voice.joinCall('vc', 'g', 'a-me', 'Eu');

    expect(await voice.startScreenShare()).toBe(true);
    expect(replaceTrack).toHaveBeenLastCalledWith(screenTrack);
    expect(patches.at(-1).is_screen_sharing).toBe(true);
    expect(voice.getCallState().activeScreenShareUserId).toBe('a-me');
    expect(voice.getScreenStream('a-me')).toBe(screen);

    await voice.stopScreenShare();
    expect(screenStop).toHaveBeenCalled();
    expect(replaceTrack).toHaveBeenLastCalledWith(null);
    expect(patches.at(-1).is_screen_sharing).toBe(false);
    expect(voice.getCallState().activeScreenShareUserId).toBeNull();
    await voice.leaveCall('a-me');
  });

  it('recusa compartilhar fora de um canal de voz', async () => {
    const voice = new SupabaseCallController({ rest: vi.fn() } as any, () => null);
    expect(await voice.startScreenShare()).toBe(false);
  });
});

describe('lista de membros no Supabase', () => {
  it('marca online quem deu heartbeat há pouco e usa o apelido do servidor', async () => {
    const now = Date.now();
    const client = {
      rest: vi.fn(async (_method: string, path: string) => {
        if (path.startsWith('/guild_members')) return [{ user_id: 'u1', nickname: 'Apelido' }, { user_id: 'u2', nickname: null }];
        if (path.startsWith('/profiles')) {
          return [
            { id: 'u1', username: 'um', display_name: 'Um', last_seen_at: new Date(now - 5_000).toISOString() },
            { id: 'u2', username: 'dois', display_name: 'Dois', last_seen_at: new Date(now - ONLINE_WINDOW_MS - 1_000).toISOString() },
          ];
        }
        return null;
      }),
    };
    const dir = createSupabaseMemberDirectory(client as any, () => ({ id: 'u1', username: 'um', displayName: 'Um' }));
    const list = await dir.listMembers('g');
    expect(list).toEqual([
      { userId: 'u1', displayName: 'Apelido', online: true },
      { userId: 'u2', displayName: 'Dois', online: false },
    ]);
    await dir.heartbeat();
    expect(client.rest).toHaveBeenLastCalledWith('PATCH', '/profiles?id=eq.u1', expect.objectContaining({ last_seen_at: expect.any(String) }), false);
  });
});
