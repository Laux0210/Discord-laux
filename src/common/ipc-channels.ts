/**
 * Dicionário estrito de canais IPC autorizados e validadores de payload.
 * Garante que nenhuma comunicação genérica ou sem validação trafegue entre processos.
 */

export const IPC_CHANNELS = {
  GET_APP_VERSION: 'app:get-version',
  GET_DESKTOP_SOURCES: 'desktop:get-sources',
  OPEN_EXTERNAL_URL: 'system:open-external',
  SYSTEM_NOTIFICATION: 'system:notification'
} as const;

export type IpcChannel = typeof IPC_CHANNELS[keyof typeof IPC_CHANNELS];

const ALLOWED_CHANNELS_SET = new Set<string>(Object.values(IPC_CHANNELS));

export function isValidChannel(channel: string): channel is IpcChannel {
  if (!channel || typeof channel !== 'string') {
    return false;
  }
  return ALLOWED_CHANNELS_SET.has(channel);
}

export interface DesktopSourceOptions {
  types?: ('screen' | 'window')[];
  thumbnailSize?: { width: number; height: number };
}

export interface OpenExternalUrlPayload {
  url: string;
}

export function validateIpcPayload(channel: string, payload: unknown): boolean {
  if (!isValidChannel(channel)) {
    return false;
  }

  switch (channel) {
    case IPC_CHANNELS.GET_APP_VERSION:
      return payload === undefined || payload === null;

    case IPC_CHANNELS.OPEN_EXTERNAL_URL: {
      if (!payload || typeof payload !== 'object') return false;
      const data = payload as Record<string, unknown>;
      if (typeof data.url !== 'string') return false;
      try {
        const parsed = new URL(data.url);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
      } catch {
        return false;
      }
    }

    case IPC_CHANNELS.GET_DESKTOP_SOURCES: {
      if (payload === undefined || payload === null) return true;
      if (typeof payload !== 'object') return false;
      const opts = payload as Record<string, unknown>;
      if ('types' in opts && opts.types !== undefined) {
        if (!Array.isArray(opts.types)) return false;
        const validTypes = new Set(['screen', 'window']);
        for (const t of opts.types) {
          if (!validTypes.has(t)) return false;
        }
      }
      return true;
    }

    case IPC_CHANNELS.SYSTEM_NOTIFICATION: {
      if (!payload || typeof payload !== 'object') return false;
      const notif = payload as Record<string, unknown>;
      return typeof notif.title === 'string' && typeof notif.body === 'string';
    }

    default:
      return false;
  }
}
