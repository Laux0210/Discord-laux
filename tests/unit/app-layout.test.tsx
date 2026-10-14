import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import React from 'react';
import { App } from '../../src/renderer/src/App';
import { MockAuthService } from '../../src/renderer/src/services/mock-auth';
import { MockChatService } from '../../src/renderer/src/services/mock-chat';
import { MockMediaService } from '../../src/renderer/src/services/mock-media';

describe('App Desktop Layout (React 19)', () => {
  it('renders the complete Discord desktop layout structure', async () => {
    const auth = new MockAuthService();
    await auth.login('amigo-1');
    const chat = new MockChatService();
    const media = new MockMediaService();

    const html = renderToString(
      React.createElement(App, {
        authService: auth,
        chatService: chat,
        mediaService: media
      })
    );

    // 1. Sidebar de comunidades / DMs
    expect(html).toContain('data-testid="sidebar"');
    expect(html).toContain('Comunidade dos Amigos');

    // 2. Lista de canais de texto e voz
    expect(html).toContain('data-testid="channel-list"');
    expect(html).toContain('geral');
    expect(html).toContain('Voz Principal');

    // 3. Área de mensagens / Chat
    expect(html).toContain('data-testid="chat-area"');
    expect(html).toContain('Conversar em #geral');

    // 4. Barra de status do usuário logado
    expect(html).toContain('data-testid="user-bar"');
    expect(html).toContain('Amigo Um (Dono)');

    // 5. Barra de controles de áudio e transmissão
    expect(html).toContain('data-testid="voice-controls"');
    expect(html).toContain('data-testid="btn-mute"');
    expect(html).toContain('data-testid="btn-screen-share"');
  });
});
