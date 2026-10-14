import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import React from 'react';
import { App } from '../../src/renderer/src/App';
import { VoiceRoomArea } from '../../src/renderer/src/components/VoiceRoomArea';
import { DesktopCallController } from '../../src/renderer/src/services/desktop-call-controller';
import { MockAuthService } from '../../src/renderer/src/services/mock-auth';
import { MockChatService } from '../../src/renderer/src/services/mock-chat';
import { MockMediaService } from '../../src/renderer/src/services/mock-media';
import type { Channel, VoiceParticipant } from '../../src/common/types';

describe('VoiceRoomArea and App Media Integration (Etapa 10)', () => {
  const dummyChannel: Channel = {
    id: 'chan-voice-main',
    guildId: 'guild-1',
    name: 'Voz Principal',
    type: 'voice'
  };

  const sampleParticipants: VoiceParticipant[] = [
    {
      userId: 'user-1',
      displayName: 'Alice (Apresentadora)',
      isMuted: false,
      isDeafened: false,
      isScreenSharing: true,
      joinedAt: 1000
    },
    {
      userId: 'user-2',
      displayName: 'Bob (Espectador)',
      isMuted: true,
      isDeafened: false,
      isScreenSharing: false,
      joinedAt: 2000
    }
  ];

  it('renderiza VoiceRoomArea com grid de participantes e contagem de capacidade', () => {
    const html = renderToString(
      React.createElement(VoiceRoomArea, {
        channel: dummyChannel,
        participants: sampleParticipants,
        activeScreenShareUserId: 'user-1',
        currentUserId: 'user-1',
        onDisconnect: () => {},
        onToggleScreenShare: () => {},
        isScreenSharing: true
      })
    );

    expect(html).toContain('data-testid="voice-room-area"');
    expect(html).toContain('Voz Principal');
    expect(html).toContain('2/10 participantes');
    expect(html).toContain('data-testid="voice-grid"');
    expect(html).toContain('Alice (Apresentadora)');
    expect(html).toContain('Bob (Espectador)');
    expect(html).toContain('Mutado');
  });

  it('exibe a área de transmissão de tela quando activeScreenShareUserId estiver definido', () => {
    const html = renderToString(
      React.createElement(VoiceRoomArea, {
        channel: dummyChannel,
        participants: sampleParticipants,
        activeScreenShareUserId: 'user-1',
        currentUserId: 'user-2',
        onDisconnect: () => {},
        onToggleScreenShare: () => {},
        isScreenSharing: false
      })
    );

    expect(html).toContain('data-testid="screen-share-view"');
    expect(html).toContain('Transmissão de Tela Ativa');
    expect(html).toContain('720p / 30fps');
  });

  it('oculta a área de transmissão quando não houver streamer ativo', () => {
    const html = renderToString(
      React.createElement(VoiceRoomArea, {
        channel: dummyChannel,
        participants: sampleParticipants.map((p) => ({ ...p, isScreenSharing: false })),
        activeScreenShareUserId: null,
        currentUserId: 'user-1',
        onDisconnect: () => {},
        onToggleScreenShare: () => {},
        isScreenSharing: false
      })
    );

    expect(html).not.toContain('data-testid="screen-share-view"');
  });

  it('renderiza VoiceRoomArea dentro de App quando o canal selecionado for de voz e o usuário estiver conectado', async () => {
    const authService = new MockAuthService();
    const user = await authService.login('alice');

    const chatService = new MockChatService();
    const mediaService = new MockMediaService();
    const callController = new DesktopCallController();

    // Alice entra na chamada de voz
    if (user) {
      await callController.joinCall('chan-voice-main', 'guild-1', user.id, user.displayName);
    }

    const html = renderToString(
      React.createElement(App, {
        authService,
        chatService,
        mediaService,
        callController,
        initialSelectedChannelId: 'chan-voice-main',
        initialIsInVoiceCall: true
      } as any)
    );

    expect(html).toContain('data-testid="voice-room-area"');
    expect(html).toContain('Voz Principal');
  });
});
