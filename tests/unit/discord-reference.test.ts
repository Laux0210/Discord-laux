import { describe, expect, it } from 'vitest';
import { DISCORD_REFERENCE_NATIVE_MODULES, resolveEndpoints } from '../../src/common/discord-reference';

describe('discord-reference', () => {
  it('usa endpoints padrao sem settings', () => {
    expect(resolveEndpoints()).toEqual({ api: 'https://discord.com/api', update: 'https://discord.com/api' });
  });

  it('respeita override de settings', () => {
    const settings = { get: (k: string) => (k === 'API_ENDPOINT' ? 'http://localhost/api' : undefined) };
    expect(resolveEndpoints(settings)).toEqual({ api: 'http://localhost/api', update: 'http://localhost/api' });
  });

  it('sem fallback nao aponta para o Discord', () => {
    expect(resolveEndpoints({ get: () => undefined }, null)).toEqual({ api: undefined, update: undefined });
    const settings = { get: (k: string) => (k === 'UPDATE_ENDPOINT' ? 'https://up.example' : undefined) };
    expect(resolveEndpoints(settings, null)).toEqual({ api: undefined, update: 'https://up.example' });
  });

  it('lista os 17 modulos nativos', () => {
    expect(DISCORD_REFERENCE_NATIVE_MODULES).toHaveLength(17);
  });
});
