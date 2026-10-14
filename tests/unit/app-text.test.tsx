import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import React from 'react';
import { App } from '../../src/renderer/src/App';
import { DesktopAuthService } from '../../src/renderer/src/services/auth-service';
import { InMemorySessionStorage, SessionManager } from '../../src/renderer/src/services/session-manager';
import { InMemoryGuildService } from '../../src/renderer/src/services/guild-service';
import { InMemoryFriendshipService } from '../../src/renderer/src/services/friendship-service';
import { InMemoryPresenceService } from '../../src/renderer/src/services/presence-service';
import { MockChatService } from '../../src/renderer/src/services/mock-chat';
import { MockMediaService } from '../../src/renderer/src/services/mock-media';
import { FriendsArea } from '../../src/renderer/src/components/FriendsArea';

describe('App Text & Friends UI Integration', () => {
  it('renderiza FriendsArea com abas e lista de amigos', async () => {
    const presence = new InMemoryPresenceService();
    presence.setPresence('user-bob', 'online');

    const html = renderToString(
      React.createElement(FriendsArea, {
        friends: [
          { friendId: 'user-bob', displayName: 'Bob Amigo', status: 'accepted' },
          { friendId: 'user-charlie', displayName: 'Charlie Pendente', status: 'pending' }
        ],
        currentUserId: 'user-alice',
        onSendFriendRequest: () => {},
        onAcceptFriendRequest: () => {},
        onOpenDm: () => {},
        presenceService: presence
      })
    );

    expect(html).toContain('data-testid="friends-area"');
    expect(html).toContain('data-testid="tab-friends-all"');
    expect(html).toContain('data-testid="tab-friends-pending"');
    expect(html).toContain('data-testid="tab-friends-add"');

    // Aba padrão Todos mostra o amigo aceito Bob
    expect(html).toContain('Bob Amigo');
    expect(html).toContain('data-testid="btn-open-dm-user-bob"');
  });

  it('renderiza a Sidebar com botão de DM pronto para alternância', async () => {
    const storage = new InMemorySessionStorage();
    const sessionManager = new SessionManager(storage);
    const authService = new DesktopAuthService(sessionManager);
    const user = await authService.login({ provider: 'mock', mockUsername: 'amigo-1' });

    const guildService = new InMemoryGuildService();
    await guildService.createGuild({ name: 'Comunidade Alpha', ownerId: user.id });

    const friendshipService = new InMemoryFriendshipService();
    const presenceService = new InMemoryPresenceService();
    const chatService = new MockChatService();
    const mediaService = new MockMediaService();

    const html = renderToString(
      React.createElement(App, {
        authService,
        chatService,
        mediaService,
        guildService,
        friendshipService,
        presenceService
      })
    );

    expect(html).toContain('data-testid="sidebar"');
    expect(html).toContain('data-testid="btn-dm-home"');
  });
});
