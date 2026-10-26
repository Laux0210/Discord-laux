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
});
