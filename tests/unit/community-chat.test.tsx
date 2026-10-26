// @vitest-environment happy-dom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatArea } from '../../src/renderer/src/components/ChatArea';

let host: HTMLDivElement, root: Root;
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals(); });
const channel = { id: 'general', guildId: 'community', name: 'geral', type: 'text' as const };
async function type(value: string) {
  await act(async () => {
    const input = host.querySelector('input')!;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
async function submit() {
  await act(async () => host.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
}

describe('envio durável de mensagem na interface', () => {
  it('mantém o rascunho e apresenta erro quando o armazenamento falha', async () => {
    const send = vi.fn(async () => { throw new Error('Não há espaço para salvar'); });
    await act(async () => root.render(<ChatArea channel={channel} currentUserId="alice" messages={[]} onSendMessage={send} />));
    await type('não perder minha conversa'); await submit();
    expect(host.querySelector('input')?.value).toBe('não perder minha conversa');
    expect(host.querySelector('[role="alert"]')?.textContent).toBe('Não há espaço para salvar');
    expect(host.querySelector('input')?.disabled).toBe(false);
  });

  it('bloqueia envio duplicado e limpa o rascunho apenas após confirmação', async () => {
    let resolve!: () => void;
    const send = vi.fn(() => new Promise<void>(done => { resolve = done; }));
    await act(async () => root.render(<ChatArea channel={channel} currentUserId="alice" messages={[]} onSendMessage={send} />));
    await type('salvar'); await submit(); await submit();
    expect(send).toHaveBeenCalledTimes(1);
    expect(host.querySelector('input')?.value).toBe('salvar');
    expect(host.querySelector('input')?.disabled).toBe(true);
    await act(async () => resolve());
    expect(host.querySelector('input')?.value).toBe('');
    expect(host.querySelector('input')?.disabled).toBe(false);
  });

  it('resposta tardia de outro canal não apaga o novo rascunho', async () => {
    let resolve!: () => void;
    const send = vi.fn(() => new Promise<void>(done => { resolve = done; }));
    await act(async () => root.render(<ChatArea channel={channel} currentUserId="alice" messages={[]} onSendMessage={send} />));
    await type('primeiro canal'); await submit();
    await act(async () => root.render(<ChatArea channel={{ ...channel, id: 'other', name: 'outro' }} currentUserId="alice" messages={[]} onSendMessage={send} />));
    await type('novo rascunho');
    await act(async () => resolve());
    expect(host.querySelector('input')?.value).toBe('novo rascunho');
  });
});
