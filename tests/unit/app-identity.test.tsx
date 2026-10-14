import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import React from 'react';
import { App } from '../../src/renderer/src/App';
import { DesktopAuthService } from '../../src/renderer/src/services/auth-service';
import { InMemorySessionStorage, SessionManager } from '../../src/renderer/src/services/session-manager';
import { InMemoryGuildService } from '../../src/renderer/src/services/guild-service';
import { MockChatService } from '../../src/renderer/src/services/mock-chat';
import { MockMediaService } from '../../src/renderer/src/services/mock-media';

describe('App Identity & Guild UI Integration', () => {
  it('renderiza o LoginModal quando nenhum usuário está autenticado', () => {
    const storage = new InMemorySessionStorage();
    const sessionManager = new SessionManager(storage);
    const authService = new DesktopAuthService(sessionManager);
    const chatService = new MockChatService();
    const mediaService = new MockMediaService();
    const guildService = new InMemoryGuildService();

    const html = renderToString(
      React.createElement(App, {
        authService,
        chatService,
        mediaService,
        guildService
      })
    );

    expect(html).toContain('data-testid="login-modal"');
    expect(html).toContain('Entrar com Google');
    expect(html).toContain('Entrar como Amigo Um (Dono)');
    expect(html).not.toContain('data-testid="channel-list"');
  });

  it('renderiza o layout completo com comunidades quando autenticado', async () => {
    const storage = new InMemorySessionStorage();
    const sessionManager = new SessionManager(storage);
    const authService = new DesktopAuthService(sessionManager);
    const user = await authService.login({ provider: 'mock', mockUsername: 'amigo-1' });

    const guildService = new InMemoryGuildService();
    const guild1 = await guildService.createGuild({ name: 'Comunidade Alpha', ownerId: user.id });
    const guild2 = await guildService.createGuild({ name: 'Comunidade Beta', ownerId: user.id });
    expect(guild1.id).toBeDefined();
    expect(guild2.id).toBeDefined();

    const chatService = new MockChatService();
    const mediaService = new MockMediaService();

    const html = renderToString(
      React.createElement(App, {
        authService,
        chatService,
        mediaService,
        guildService
      })
    );

    // Deve estar no layout principal
    expect(html).not.toContain('data-testid="login-modal"');
    expect(html).toContain('data-testid="sidebar"');
    expect(html).toContain('data-testid="user-bar"');
    expect(html).toContain('Amigo Um (Dono)');
    expect(html).toContain('btn-logout');

    // Sidebar deve conter as comunidades ou botão de adicionar
    expect(html).toContain('data-testid="btn-add-guild"');
  });
});
