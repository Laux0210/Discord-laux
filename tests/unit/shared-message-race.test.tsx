// @vitest-environment happy-dom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../src/renderer/src/App';
import { MockChatService } from '../../src/renderer/src/services/mock-chat';
import { MockMediaService } from '../../src/renderer/src/services/mock-media';
import type { Message } from '../../src/common/types';

vi.mock('../../src/renderer/src/services/realtime-network-service', () => ({
  realtimeNetworkService: { onRemoteScreenStream: () => () => {} },
}));

afterEach(() => vi.unstubAllGlobals());

describe('histórico inicial e mensagens recebidas durante carregamento', () => {
  it('mantém mensagem recebida antes de uma resposta inicial mais antiga', async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    const host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);
    const chat = new MockChatService();
    let resolveHistory!: (messages: Message[]) => void;
    let incoming!: (message: Message) => void;
    vi.spyOn(chat, 'getMessages').mockImplementation(() => new Promise(resolve => { resolveHistory = resolve; }));
    vi.spyOn(chat, 'onNewMessage').mockImplementation((_channel, callback) => { incoming = callback; return () => {}; });
    const owner = { id: 'owner', username: 'owner', displayName: 'Dono' };
    const auth = { getCurrentUser: () => owner, login: async () => owner, logout: async () => {} };
    try {
      await act(async () => root.render(<App authService={auth} chatService={chat} mediaService={new MockMediaService()} sharedBackend />));
      const base = { channelId: 'chan-general', authorId: owner.id, authorName: owner.displayName };
      await act(async () => incoming({ ...base, id: 'new', content: 'Recebida enquanto carregava', createdAt: 2 }));
      await act(async () => resolveHistory([{ ...base, id: 'old', content: 'Histórico anterior', createdAt: 1 }]));
      expect(host.textContent).toContain('Recebida enquanto carregava');
      expect(host.textContent).toContain('Histórico anterior');
    } finally {
      await act(async () => root.unmount());
      host.remove();
    }
  });
});
