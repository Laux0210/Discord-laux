// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import { StorageService } from '../../src/renderer/src/services/storage-service';
import { RealtimeNetworkService } from '../../src/renderer/src/services/realtime-network-service';
import type { User, Message } from '../../src/common/types';

describe('StorageService (Persistência ao Atualizar a Página)', () => {
  let storage: StorageService;

  beforeEach(() => {
    storage = new StorageService();
  });

  it('salva e recupera o usuário ativo persistente', () => {
    const mockUser: User = {
      id: 'user-persist-1',
      username: 'laux',
      displayName: 'Laux Oficial',
      avatarUrl: ''
    };

    storage.saveCurrentUser(mockUser);
    // Em ambiente de teste sem localStorage real, saveCurrentUser não deve lançar exceção
    // Quando simulado window.localStorage:
    const fakeStore: Record<string, string> = {};
    (window as any).localStorage = {
      getItem: (k: string) => fakeStore[k] ?? null,
      setItem: (k: string, v: string) => { fakeStore[k] = v; },
      removeItem: (k: string) => { delete fakeStore[k]; }
    };

    storage.saveCurrentUser(mockUser);
    expect(storage.getCurrentUser()).toEqual(mockUser);

    storage.saveCurrentUser(null);
    expect(storage.getCurrentUser()).toBeNull();
  });

  it('salva e recupera mensagens de canais entre atualizações', () => {
    const fakeStore: Record<string, string> = {};
    (window as any).localStorage = {
      getItem: (k: string) => fakeStore[k] ?? null,
      setItem: (k: string, v: string) => { fakeStore[k] = v; },
      removeItem: (k: string) => { delete fakeStore[k]; }
    };

    const msg: Message = {
      id: 'msg-p1',
      channelId: 'chan-general',
      authorId: 'user-1',
      authorName: 'Amigo Um',
      content: 'Mensagem permanente que resiste ao F5',
      createdAt: Date.now()
    };

    storage.saveChannelMessage('chan-general', msg);
    const retrieved = storage.getChannelMessages('chan-general');
    expect(retrieved).not.toBeNull();
    expect(retrieved?.length).toBe(1);
    expect(retrieved?.[0].content).toBe('Mensagem permanente que resiste ao F5');
  });

  it('persiste configurações de volume e perfil de usuário', () => {
    const fakeStore: Record<string, string> = {};
    (window as any).localStorage = {
      getItem: (k: string) => fakeStore[k] ?? null,
      setItem: (k: string, v: string) => { fakeStore[k] = v; },
      removeItem: (k: string) => { delete fakeStore[k]; }
    };

    storage.saveSettings({ inputVolume: 75, outputVolume: 90, customStatus: '🎮 Jogando ARK' });
    const settings = storage.getSettings();
    expect(settings.inputVolume).toBe(75);
    expect(settings.outputVolume).toBe(90);
    expect(settings.customStatus).toBe('🎮 Jogando ARK');
  });
});

describe('RealtimeNetworkService (Multi-dispositivos e WebRTC Mesh)', () => {
  it('inicializa e expõe métodos de transmissão de voz, tela e chat', () => {
    const realtime = new RealtimeNetworkService();
    expect(typeof realtime.init).toBe('function');
    expect(typeof realtime.broadcastChatMessage).toBe('function');
    expect(typeof realtime.joinVoiceChannel).toBe('function');
    expect(typeof realtime.leaveVoiceChannel).toBe('function');
    expect(typeof realtime.broadcastSpeaking).toBe('function');
    expect(typeof realtime.broadcastScreenShareStart).toBe('function');
    expect(typeof realtime.broadcastScreenShareStop).toBe('function');
  });
});
