/**
 * Parametros de referencia do host Discord desktop 1.0.9265 (stable, win-x64).
 * Origem: docs/rea/discord/parametros-host-1.0.9265.md (analise estatica do app.asar,
 * SHA-256 0025c02c7241045a12464309604ec4d5b8ec7ed2ce43cce05d5dacb8f253f672).
 */

export const DISCORD_REFERENCE_BUILD = {
  releaseChannel: 'stable',
  version: '1.0.9265',
  sentryDist: 'stable-win-x64',
} as const;

export const DISCORD_REFERENCE_APP = {
  name: 'Discord',
  id: 'com.squirrel.Discord.Discord',
  protocol: 'Discord',
} as const;

export const DISCORD_REFERENCE_ENDPOINTS = {
  api: 'https://discord.com/api',
  updates: 'https://updates.discord.com/',
  cdn: 'https://cdn.discordapp.com',
  download: 'https://discord.com/api/download/',
} as const;

export const DISCORD_REFERENCE_SETTING_KEYS = [
  'API_ENDPOINT',
  'UPDATE_ENDPOINT',
  'ALLOW_OPTIONAL_UPDATES',
  'ALWAYS_ALLOW_UPDATES',
  'ALWAYS_BOOTSTRAP_MODULES',
  'DISCORD_CLEAR_BUILD_OVERRIDE',
] as const;

export const DISCORD_REFERENCE_SPLASH_EVENTS = [
  'DISCORD_SPLASH_SCREEN_READY',
  'DISCORD_SPLASH_SCREEN_QUIT',
  'DISCORD_SPLASH_UPDATE_STATE',
  'DISCORD_SPLASH_SCREEN_QUOTE',
] as const;

export const DISCORD_REFERENCE_STARTUP_FLAGS = [
  'DESKTOP_TTI_DNSTCP_WARMUP',
  'DESKTOP_TTI_EARLY_UPDATE_CHECK',
  'DESKTOP_TTI_SPLASH_USE_WEBP',
] as const;

export const DISCORD_REFERENCE_NATIVE_MODULES = [
  'discord_cloudsync',
  'discord_desktop_core',
  'discord_desktop_overlay',
  'discord_dispatch',
  'discord_erlpack',
  'discord_game_utils',
  'discord_hook',
  'discord_krisp',
  'discord_media',
  'discord_modules',
  'discord_notifications',
  'discord_overlay2',
  'discord_rpc',
  'discord_spellcheck',
  'discord_utils',
  'discord_voice',
  'discord_zstd',
] as const;

type SettingsReader = { get(key: string): unknown };

export interface ResolvedEndpoints {
  api: string | undefined;
  update: string | undefined;
}

/**
 * Mesmo padrao do host: valor de settings com fallback para o padrao.
 * O app proprio passa fallbackApi null para nunca apontar ao servidor do Discord.
 */
export function resolveEndpoints(
  settings?: SettingsReader,
  fallbackApi: string | null = DISCORD_REFERENCE_ENDPOINTS.api
): ResolvedEndpoints {
  const read = (key: string) => {
    const value = settings?.get(key);
    return typeof value === 'string' && value ? value : undefined;
  };
  const api = read('API_ENDPOINT') ?? fallbackApi ?? undefined;
  return { api, update: read('UPDATE_ENDPOINT') ?? api };
}
