/** Entrada de validação manual; não integra index.html nem o build de produção. */
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { MockAuthService } from './services/mock-auth';
import { MockChatService } from './services/mock-chat';
import { MockMediaService } from './services/mock-media';
import { InMemoryGuildService } from './services/guild-service';
import { InMemoryFriendshipService } from './services/friendship-service';
import { InMemoryPresenceService } from './services/presence-service';
import { realtimeNetworkService } from './services/realtime-network-service';
import { voiceMediaService } from './services/voice-media-service';
import './index.css';

// As substituições valem somente para esta página de validação.
realtimeNetworkService.init = () => {};
voiceMediaService.startMicrophone = async () => null;
voiceMediaService.startScreenShare = async () => null;

async function mount() {
  const authService = new MockAuthService();
  await authService.login('amigo-1');
  const guildService = new InMemoryGuildService();
  const guild = await guildService.createGuild({ name: 'Comunidade de Teste Local', ownerId: 'user-1' });
  guildService.addMemberDirect(guild.id, 'user-2');
  guildService.addMemberDirect(guild.id, 'user-3');
  const friendshipService = new InMemoryFriendshipService();
  await friendshipService.sendFriendRequest('user-1', 'user-2');
  await friendshipService.acceptFriendRequest('user-2', 'user-1');
  const container = document.getElementById('root');
  if (!container) throw new Error('Container ausente');
  createRoot(container).render(<App authService={authService} chatService={new MockChatService()}
    mediaService={new MockMediaService()} guildService={guildService}
    friendshipService={friendshipService} presenceService={new InMemoryPresenceService()} />);
}

void mount().catch((error: unknown) => {
  const container = document.getElementById('root');
  if (container) container.textContent = 'Falha ao iniciar a validação local.';
  console.error(error);
});
