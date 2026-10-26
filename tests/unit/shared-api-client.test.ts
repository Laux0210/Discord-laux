import { afterEach, describe, expect, it, vi } from 'vitest';
import { SharedApiClient, decodeTransport, encodeTransport } from '../../src/renderer/src/services/remote-app-services';

afterEach(() => vi.unstubAllGlobals());

describe('cliente do armazenamento compartilhado', () => {
  it('invoca fetch com o receptor global exigido pelo navegador', async () => {
    const fetcher = vi.fn(function (this: unknown) {
      expect(this).toBe(globalThis);
      return Promise.resolve(new Response('{"ok":true}'));
    });
    expect(await new SharedApiClient('/api', fetcher).request('/health')).toEqual({ ok: true });
  });
  it('transporta permissões bigint sem converter textos comuns', () => {
    const original = { permissions: 1n << 28n, name: '123', nested: [0n] };
    expect(decodeTransport(encodeTransport(original))).toEqual(original);
    expect(decodeTransport('{"$bigint":"oops"}')).toEqual({ $bigint: 'oops' });
    expect(decodeTransport('{"$bigint":"42","other":true}')).toEqual({ $bigint: '42', other: true });
  });

  it('usa credencial da sessão e envia RPC para o backend, sem identidade implícita do navegador', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response('{"result":{"permissions":{"$bigint":"1024"}}}'));
    const api = new SharedApiClient('http://127.0.0.1:8787/api', fetcher);
    api.setToken('token-local-de-teste');
    expect(await api.rpc('guild', 'getGuildRoles', ['guild-community'])).toEqual({ permissions: 1024n });
    const [url, options] = fetcher.mock.calls[0];
    expect(url).toBe('http://127.0.0.1:8787/api/rpc');
    expect(options.headers.Authorization).toBe('Bearer token-local-de-teste');
    expect(JSON.parse(options.body)).toEqual({ service: 'guild', method: 'getGuildRoles', args: ['guild-community'] });
  });

  it('rejeita resultado de sessão anterior após troca de conta', async () => {
    let resolveResponse!: (value: Response) => void;
    const fetcher = vi.fn().mockImplementation(() => new Promise<Response>(resolve => { resolveResponse = resolve; }));
    const api = new SharedApiClient('/api', fetcher);
    const pending = api.request('/users');
    api.setToken('nova-sessao');
    resolveResponse(new Response('[]'));
    await expect(pending).rejects.toThrow('A sessão mudou');
  });

  it('propaga erro de autorização do servidor em vez de apresentar falso sucesso', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response('{"error":"Sem permissão"}', { status: 403 }));
    const api = new SharedApiClient('/api', fetcher);
    await expect(api.rpc('guild', 'createChannel', [{}])).rejects.toThrow('Sem permissão');
  });

  it('reutiliza somente token salvo para restaurar a sessão', () => {
    const getItem = vi.fn().mockReturnValue('token-recarregado');
    const removeItem = vi.fn();
    vi.stubGlobal('window', { localStorage: { getItem, setItem: vi.fn(), removeItem } });
    const fetcher = vi.fn().mockResolvedValue(new Response('{"user":null}'));
    const api = new SharedApiClient('/api', fetcher);
    expect(getItem).toHaveBeenCalledWith('discord_laux_shared_session_v1');
    api.setToken(null);
    expect(removeItem).toHaveBeenCalledWith('discord_laux_shared_session_v1');
  });
});
