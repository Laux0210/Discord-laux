// @vitest-environment happy-dom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Storage } from 'happy-dom';
import type { DmMessage } from '../../src/common/text-types';
import type { User } from '../../src/common/types';
import { DirectMessageArea } from '../../src/renderer/src/components/DirectMessageArea';
import { InMemoryFriendshipService } from '../../src/renderer/src/services/friendship-service';
import { createLocalAppServices } from '../../src/renderer/src/services/local-app-services';
import { App } from '../../src/renderer/src/App';

// Estes testes exercitam DMs locais; os adapters de rede não integram este lote.
vi.mock('../../src/renderer/src/services/realtime-network-service', () => ({
  realtimeNetworkService: {
    init: vi.fn(),
    onRemoteScreenStream: () => () => {}
  }
}));

const alice: User = { id: 'user-1', username: 'alice', displayName: 'Alice' };
const charlie: User = { id: 'user-3', username: 'charlie', displayName: 'Charlie' };
let host: HTMLDivElement;
let root: Root;

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

async function acceptedService() {
  const service = new InMemoryFriendshipService();
  for (const [a, b] of [['user-1', 'user-2'], ['user-1', 'user-3'], ['user-2', 'user-3']]) {
    await service.sendFriendRequest(a, b);
    await service.acceptFriendRequest(b, a);
  }
  return service;
}

async function renderConversation(service: InMemoryFriendshipService, user = alice, friendId = 'user-2') {
  await act(async () => root.render(
    <DirectMessageArea service={service} user={user} friendId={friendId} friendName={friendId} onBack={() => {}} />
  ));
}

async function click(element: Element | null) {
  expect(element).not.toBeNull();
  await act(async () => (element as HTMLElement).click());
}

async function draft(value: string) {
  const input = host.querySelector('textarea')!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

async function submit() {
  await act(async () => { host.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });
}

beforeEach(() => {
  vi.stubGlobal('localStorage', new Storage());
  window.localStorage.clear();
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  window.localStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('conversa direta local com efeitos React reais', () => {
  it('mantém o contrato de login legado ao retornar à tela de entrada', async () => {
    const services = await createLocalAppServices();
    const login = vi.fn(async (username: string) => {
      if (typeof username !== 'string') throw new Error('Login legado exige nome de usuário');
      return alice;
    });
    const auth = { login, logout: async () => {}, getCurrentUser: () => null };
    await act(async () => root.render(<App {...services} authService={auth} />));
    await click(host.querySelector('[data-testid="btn-login-google"]'));
    expect(login).toHaveBeenCalledWith('google-user');
    expect(host.querySelector('[data-testid="login-error"]')).toBeNull();
  });

  it('abre pela UI do App, envia, volta aos Amigos e reabre o histórico', async () => {
    const services = await createLocalAppServices();
    await act(async () => root.render(<App {...services} />));
    await click(host.querySelector('[data-testid="btn-dm-home"]'));
    await click(host.querySelector('[data-testid="btn-open-dm-user-2"]'));
    expect(host.querySelector('[data-testid="direct-message-area"]')).not.toBeNull();
    expect(host.textContent).toContain('Nenhuma mensagem');
    expect(host.querySelector('textarea')?.maxLength).toBe(2000);
    await draft('Olá no privado');
    await submit();
    expect(host.textContent).toContain('Olá no privado');
    await click(Array.from(host.querySelectorAll('button')).find((b) => b.textContent === 'Voltar para Amigos')!);
    expect(host.querySelector('[data-testid="friends-area"]')).not.toBeNull();
    await click(host.querySelector('[data-testid="btn-open-dm-user-2"]'));
    expect(host.textContent).toContain('Olá no privado');
    await click(host.querySelector('[data-testid="btn-dm-home"]'));
    expect(host.querySelector('[data-testid="direct-message-area"]')).toBeNull();
  });

  it('preserva rascunho em falha, bloqueia submit concorrente e reutiliza nonce após confirmação perdida', async () => {
    const service = await acceptedService();
    const originalSend = service.sendDmMessage.bind(service);
    const gate = deferred<void>();
    const send = vi.spyOn(service, 'sendDmMessage').mockImplementationOnce(async (params) => {
      await gate.promise;
      await originalSend(params);
      throw new Error('Confirmação indisponível');
    });
    await renderConversation(service);
    await draft('Não duplicar');
    await act(async () => {
      const form = host.querySelector('form')!;
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    expect(send).toHaveBeenCalledTimes(1);
    await act(async () => gate.resolve());
    expect(host.querySelector('textarea')!.value).toBe('Não duplicar');
    expect(host.querySelector('[role="alert"]')?.textContent).toContain('Confirmação indisponível');
    await submit();
    expect(send).toHaveBeenCalledTimes(2);
    expect(send.mock.calls[0][0].nonce).toBeTruthy();
    expect(send.mock.calls[1][0].nonce).toBe(send.mock.calls[0][0].nonce);
    const channel = await service.getOrCreateDmChannel(alice.id, 'user-2');
    expect(await service.getDmMessages(channel.id, alice.id)).toHaveLength(1);
    expect(host.querySelector('textarea')!.value).toBe('');
  });

  it.each(['usuário', 'destinatário', 'serviço'] as const)('descarta leitura antiga após troca de %s', async (change) => {
    const service = await acceptedService();
    const oldRead = deferred<DmMessage[]>();
    vi.spyOn(service, 'getDmMessages').mockImplementationOnce(() => oldRead.promise);
    await renderConversation(service);
    expect(host.textContent).toContain('Carregando');
    const nextService = change === 'serviço' ? await acceptedService() : service;
    await renderConversation(nextService, change === 'usuário' ? charlie : alice, change === 'destinatário' ? 'user-3' : 'user-2');
    await act(async () => oldRead.resolve([{
      id: 'old', dmChannelId: 'old-channel', authorId: alice.id, authorName: 'Alice', content: 'SEGREDO ANTIGO', createdAt: Date.now()
    }]));
    expect(host.textContent).not.toContain('SEGREDO ANTIGO');
    expect(host.querySelector('textarea')!.value).toBe('');
  });

  it.each(['usuário', 'destinatário', 'serviço'] as const)('envio pendente não altera a conversa após troca de %s', async (change) => {
    const service = await acceptedService();
    const sent = deferred<DmMessage>();
    vi.spyOn(service, 'sendDmMessage').mockReturnValueOnce(sent.promise);
    await renderConversation(service);
    await draft('Envio antigo');
    await submit();
    const replacement = change === 'serviço' ? await acceptedService() : service;
    await renderConversation(replacement, change === 'usuário' ? charlie : alice, change === 'destinatário' ? 'user-3' : 'user-2');
    await draft('Rascunho da nova conversa');
    await act(async () => sent.resolve({
      id: 'late-send', dmChannelId: 'old-channel', authorId: alice.id, authorName: 'Alice', content: 'Envio antigo', createdAt: Date.now()
    }));
    expect(host.querySelector('textarea')!.value).toBe('Rascunho da nova conversa');
    expect(host.textContent).not.toContain('Envio antigo');
    expect(host.querySelector('textarea')!.disabled).toBe(false);
  });

  it('logout pela UI descarta a seleção e a leitura pendente antes de outra sessão', async () => {
    const services = await createLocalAppServices();
    const reading = deferred<DmMessage[]>();
    vi.spyOn(services.friendshipService, 'getDmMessages').mockReturnValueOnce(reading.promise);
    await act(async () => root.render(<App {...services} />));
    await click(host.querySelector('[data-testid="btn-dm-home"]'));
    await click(host.querySelector('[data-testid="btn-open-dm-user-2"]'));
    expect(host.textContent).toContain('Carregando');
    await click(host.querySelector('[data-testid^="guild-item-"]'));
    await click(host.querySelector('[data-testid="btn-logout"]'));
    expect(host.querySelector('[data-testid="login-modal"]')).not.toBeNull();
    await act(async () => reading.resolve([{
      id: 'old-logout', dmChannelId: 'old-channel', authorId: alice.id, authorName: 'Alice', content: 'SEGREDO SESSÃO ENCERRADA', createdAt: Date.now()
    }]));
    await click(host.querySelector('[data-testid="btn-login-amigo-2"]'));
    await click(host.querySelector('[data-testid="btn-dm-home"]'));
    expect(host.querySelector('[data-testid="direct-message-area"]')).toBeNull();
    expect(host.querySelector('[data-testid="friends-area"]')).not.toBeNull();
    expect(host.textContent).not.toContain('SEGREDO SESSÃO ENCERRADA');
  });

  it('não reaproveita rascunho ou histórico no primeiro render de um novo serviço', async () => {
    const service = await acceptedService();
    const channel = await service.getOrCreateDmChannel(alice.id, 'user-2');
    await service.sendDmMessage({ dmChannelId: channel.id, authorId: alice.id, authorName: 'Alice', content: 'Histórico antigo' });
    await renderConversation(service);
    await draft('Rascunho antigo');
    const replacement = await acceptedService();
    const opening = deferred<Awaited<ReturnType<typeof replacement.getOrCreateDmChannel>>>();
    vi.spyOn(replacement, 'getOrCreateDmChannel').mockReturnValue(opening.promise);
    await renderConversation(replacement);
    expect(host.textContent).not.toContain('Histórico antigo');
    expect(host.querySelector('textarea')!.value).toBe('');
    expect(host.textContent).toContain('Carregando');
  });

  it('oculta conteúdo na invalidação e não restaura leitura pendente após revogação', async () => {
    const service = await acceptedService();
    const channel = await service.getOrCreateDmChannel(alice.id, 'user-2');
    const message = await service.sendDmMessage({ dmChannelId: channel.id, authorId: alice.id, authorName: 'Alice', content: 'Privado antes do bloqueio' });
    await renderConversation(service);
    expect(host.textContent).toContain('Privado antes do bloqueio');
    const oldRead = deferred<DmMessage[]>();
    vi.spyOn(service, 'getDmMessages').mockImplementationOnce(() => oldRead.promise);
    await act(async () => { await service.sendDmMessage({ dmChannelId: channel.id, authorId: 'user-2', authorName: 'Bob', content: 'Outra mensagem' }); });
    expect(host.textContent).not.toContain('Privado antes do bloqueio');
    await act(async () => { await service.blockUser('user-2', alice.id); });
    await act(async () => oldRead.resolve([message]));
    expect(host.textContent).not.toContain('Privado antes do bloqueio');
    expect(host.querySelector('[role="alert"]')).not.toBeNull();
    expect(host.querySelector('textarea')!.disabled).toBe(true);
  });

  it('remove a inscrição ao desmontar e ignora abertura concluída depois da desmontagem', async () => {
    const service = await acceptedService();
    const subscribe = service.onDmUpdated!.bind(service);
    const remove = vi.fn();
    vi.spyOn(service, 'onDmUpdated').mockImplementation((...args) => {
      const unsubscribe = subscribe(...args);
      return () => { unsubscribe(); remove(); };
    });
    await renderConversation(service);
    await act(async () => root.render(null));
    expect(remove).toHaveBeenCalledOnce();
    const late = deferred<Awaited<ReturnType<typeof service.getOrCreateDmChannel>>>();
    vi.spyOn(service, 'getOrCreateDmChannel').mockReturnValue(late.promise);
    const reads = vi.spyOn(service, 'getDmMessages');
    await renderConversation(service);
    await act(async () => root.render(null));
    reads.mockClear();
    await act(async () => late.resolve({ id: 'late', participantIds: [alice.id, 'user-2'], createdAt: Date.now() }));
    expect(reads).not.toHaveBeenCalled();
    expect(host.textContent).toBe('');
  });

  it('oferece atualização manual quando o serviço não possui subscription', async () => {
    const service = await acceptedService();
    Object.defineProperty(service, 'onDmUpdated', { value: undefined });
    await renderConversation(service);
    const channel = await service.getOrCreateDmChannel(alice.id, 'user-2');
    await service.sendDmMessage({ dmChannelId: channel.id, authorId: 'user-2', authorName: 'Bob', content: 'Recebida sem evento' });
    expect(host.textContent).not.toContain('Recebida sem evento');
    await click(Array.from(host.querySelectorAll('button')).find((b) => b.textContent === 'Atualizar')!);
    expect(host.textContent).toContain('Recebida sem evento');
  });

  it('recusa envio após amizade removida mesmo sem subscription, limpa histórico e preserva rascunho', async () => {
    const service = await acceptedService();
    Object.defineProperty(service, 'onDmUpdated', { value: undefined });
    const channel = await service.getOrCreateDmChannel(alice.id, 'user-2');
    await service.sendDmMessage({ dmChannelId: channel.id, authorId: 'user-2', authorName: 'Bob', content: 'Histórico autorizado antes' });
    await renderConversation(service);
    await draft('Não deve ser enviada');
    await service.removeFriendship(alice.id, 'user-2');
    await submit();
    expect(host.textContent).not.toContain('Histórico autorizado antes');
    expect(host.querySelector('[role="alert"]')?.textContent).toContain('AMIZADE_NECESSARIA_PARA_DM');
    expect(host.querySelector('textarea')!.value).toBe('Não deve ser enviada');
    expect(host.querySelector('textarea')!.disabled).toBe(true);
  });
});
