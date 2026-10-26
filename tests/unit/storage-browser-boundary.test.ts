import { afterEach, describe, expect, it, vi } from 'vitest';
import { browserStorageAdapter } from '../../src/renderer/src/services/storage-service';
import { InMemoryGuildService } from '../../src/renderer/src/services/guild-service';
import { createLocalAppServices } from '../../src/renderer/src/services/local-app-services';

afterEach(() => vi.unstubAllGlobals());

describe('fronteira do armazenamento persistente no navegador', () => {
  it('recusa inicialização quando a API de armazenamento está ausente', () => {
    vi.stubGlobal('window', {});
    expect(() => new InMemoryGuildService(browserStorageAdapter)).toThrow('ARMAZENAMENTO_INDISPONIVEL');
  });

  it('a composição browser não troca silenciosamente persistência por memória', async () => {
    vi.stubGlobal('window', {});
    await expect(createLocalAppServices()).rejects.toThrow('ARMAZENAMENTO_INDISPONIVEL');
  });

  it('não transforma leitura bloqueada em banco novo nem sobrescreve dados', () => {
    const write = vi.fn();
    vi.stubGlobal('window', { localStorage: {
      getItem: () => { throw new DOMException('Leitura bloqueada', 'SecurityError'); },
      setItem: write,
      removeItem: vi.fn(),
    } });
    expect(() => new InMemoryGuildService(browserStorageAdapter)).toThrow('Leitura bloqueada');
    expect(write).not.toHaveBeenCalled();
  });

  it('não confirma comunidade quando a cota de gravação está esgotada', async () => {
    vi.stubGlobal('window', { localStorage: {
      getItem: () => null,
      setItem: () => { throw new DOMException('Cota esgotada', 'QuotaExceededError'); },
      removeItem: vi.fn(),
    } });
    const guild = new InMemoryGuildService(browserStorageAdapter);
    await expect(guild.ensureCommonGuild('owner', 'owner')).rejects.toThrow('Cota esgotada');
    expect(await guild.getUserGuilds('owner')).toEqual([]);
  });

  it('reabre o snapshot íntegro pela API do navegador', async () => {
    const data = new Map<string, string>();
    vi.stubGlobal('window', { localStorage: {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => data.set(key, value),
      removeItem: (key: string) => data.delete(key),
    } });
    const first = new InMemoryGuildService(browserStorageAdapter);
    const guild = await first.ensureCommonGuild('owner', 'owner');
    await first.createChannel({ guildId: guild.id, actorId: 'owner', name: 'persistente', type: 'text' });
    const second = new InMemoryGuildService(browserStorageAdapter);
    expect((await second.getGuildChannels(guild.id, 'owner')).some(channel => channel.name === 'persistente')).toBe(true);
  });
});
