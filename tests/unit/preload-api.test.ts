import { describe, it, expect, vi } from 'vitest';
import { createPreloadApi } from '../../src/preload/api';
import { IPC_CHANNELS } from '../../src/common/ipc-channels';

describe('Preload Bridge Security & API', () => {
  it('exposes only explicit, safe methods without leaking ipcRenderer', () => {
    const mockIpc = {
      invoke: vi.fn(),
      on: vi.fn(),
      removeListener: vi.fn()
    };

    const api = createPreloadApi(mockIpc as any);

    const keys = Object.keys(api).sort();
    expect(keys).toEqual([
      'getAppVersion',
      'getEndpoints',
      'getSystemSources',
      'onSystemNotification',
      'openExternalUrl'
    ]);

    expect((api as any).ipcRenderer).toBeUndefined();
    expect((api as any).send).toBeUndefined();
    expect((api as any).require).toBeUndefined();
  });

  it('calls correct IPC channels when methods are invoked', async () => {
    const mockIpc = {
      invoke: vi.fn().mockImplementation((channel: string) => {
        if (channel === IPC_CHANNELS.GET_APP_VERSION) return Promise.resolve('0.1.0');
        if (channel === IPC_CHANNELS.GET_DESKTOP_SOURCES) return Promise.resolve([{ id: 'screen:1', name: 'Tela 1' }]);
        if (channel === IPC_CHANNELS.OPEN_EXTERNAL_URL) return Promise.resolve(true);
        return Promise.reject(new Error('Unknown channel'));
      }),
      on: vi.fn(),
      removeListener: vi.fn()
    };

    const api = createPreloadApi(mockIpc as any);

    const version = await api.getAppVersion();
    expect(version).toBe('0.1.0');
    expect(mockIpc.invoke).toHaveBeenCalledWith(IPC_CHANNELS.GET_APP_VERSION, undefined);

    const sources = await api.getSystemSources({ types: ['screen'] });
    expect(sources).toHaveLength(1);
    expect(mockIpc.invoke).toHaveBeenCalledWith(IPC_CHANNELS.GET_DESKTOP_SOURCES, { types: ['screen'] });

    const openResult = await api.openExternalUrl('https://example.com');
    expect(openResult).toBe(true);
    expect(mockIpc.invoke).toHaveBeenCalledWith(IPC_CHANNELS.OPEN_EXTERNAL_URL, { url: 'https://example.com' });
  });

  it('registers notification listeners safely and returns unsubscribe function', () => {
    let capturedListener: ((event: unknown, data: any) => void) | undefined;
    const mockIpc = {
      invoke: vi.fn(),
      on: vi.fn().mockImplementation((channel: string, listener: any) => {
        if (channel === IPC_CHANNELS.SYSTEM_NOTIFICATION) {
          capturedListener = listener;
        }
      }),
      removeListener: vi.fn()
    };

    const api = createPreloadApi(mockIpc as any);
    const callback = vi.fn();

    const unsubscribe = api.onSystemNotification(callback);
    expect(mockIpc.on).toHaveBeenCalledWith(IPC_CHANNELS.SYSTEM_NOTIFICATION, expect.any(Function));

    // Simula evento chegando pelo IPC
    if (capturedListener) {
      capturedListener({}, { title: 'Chamada Iniciada', body: 'Você entrou na chamada' });
    }
    expect(callback).toHaveBeenCalledWith('Chamada Iniciada', 'Você entrou na chamada');

    // Desinscreve
    unsubscribe();
    expect(mockIpc.removeListener).toHaveBeenCalledWith(IPC_CHANNELS.SYSTEM_NOTIFICATION, expect.any(Function));
  });
});
