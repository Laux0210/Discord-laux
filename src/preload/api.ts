import { IPC_CHANNELS, type DesktopSourceOptions } from '../common/ipc-channels';

export interface PreloadApi {
  getAppVersion: () => Promise<string>;
  getSystemSources: (opts?: DesktopSourceOptions) => Promise<unknown>;
  openExternalUrl: (url: string) => Promise<boolean>;
  onSystemNotification: (callback: (title: string, body: string) => void) => () => void;
}

export interface MinimalIpcRenderer {
  invoke(channel: string, ...args: unknown[]): Promise<unknown>;
  on(channel: string, listener: (event: unknown, ...args: any[]) => void): void;
  removeListener(channel: string, listener: (event: unknown, ...args: any[]) => void): void;
}

export function createPreloadApi(ipc: MinimalIpcRenderer): PreloadApi {
  return {
    getAppVersion: async (): Promise<string> => {
      const version = await ipc.invoke(IPC_CHANNELS.GET_APP_VERSION, undefined);
      return String(version);
    },

    getSystemSources: async (opts?: DesktopSourceOptions): Promise<unknown> => {
      return ipc.invoke(IPC_CHANNELS.GET_DESKTOP_SOURCES, opts);
    },

    openExternalUrl: async (url: string): Promise<boolean> => {
      const res = await ipc.invoke(IPC_CHANNELS.OPEN_EXTERNAL_URL, { url });
      return Boolean(res);
    },

    onSystemNotification: (callback: (title: string, body: string) => void): (() => void) => {
      const listener = (_event: unknown, data: any) => {
        if (data && typeof data === 'object') {
          callback(String(data.title ?? ''), String(data.body ?? ''));
        }
      };

      ipc.on(IPC_CHANNELS.SYSTEM_NOTIFICATION, listener);

      return () => {
        ipc.removeListener(IPC_CHANNELS.SYSTEM_NOTIFICATION, listener);
      };
    }
  };
}
