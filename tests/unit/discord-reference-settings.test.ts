import { describe, expect, it } from 'vitest';
import { resolveEndpoints } from '../../src/common/discord-reference';

describe('configuração dos endpoints de referência', () => {
  it('permite configurar atualização sem redirecionar a API', () => {
    const settings = {
      get: (key: string) => key === 'UPDATE_ENDPOINT' ? 'https://updates.example.test/' : undefined,
    };

    expect(resolveEndpoints(settings)).toEqual({
      api: 'https://discord.com/api',
      update: 'https://updates.example.test/',
    });
  });

  it('mantém API e atualização independentes quando ambas são configuradas', () => {
    const values: Record<string, unknown> = {
      API_ENDPOINT: 'https://api.example.test/',
      UPDATE_ENDPOINT: 'https://updates.example.test/',
    };

    expect(resolveEndpoints({ get: key => values[key] })).toEqual({
      api: 'https://api.example.test/',
      update: 'https://updates.example.test/',
    });
  });

  it.each([undefined, null, '', false, 42, {}, []])(
    'usa o padrão quando os valores não são strings preenchidas (caso %#)',
    value => {
      expect(resolveEndpoints({ get: () => value })).toEqual({
        api: 'https://discord.com/api',
        update: 'https://discord.com/api',
      });
    },
  );

  it('usa a API configurada quando o endereço de atualização está vazio', () => {
    const settings = {
      get: (key: string) => key === 'API_ENDPOINT' ? 'https://api.example.test/' : '',
    };

    expect(resolveEndpoints(settings)).toEqual({
      api: 'https://api.example.test/',
      update: 'https://api.example.test/',
    });
  });
});
