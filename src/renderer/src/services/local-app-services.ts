import { MockAuthService } from './mock-auth';
import { DesktopChatService } from './desktop-chat-service';
import { MockMediaService } from './mock-media';
import { DesktopCallController } from './desktop-call-controller';
import { InMemoryGuildService } from './guild-service';
import { InMemoryFriendshipService } from './friendship-service';
import { InMemoryPresenceService } from './presence-service';

export interface LocalAppServices {
  authService: MockAuthService;
  chatService: DesktopChatService;
  mediaService: MockMediaService;
  callController: DesktopCallController;
  guildService: InMemoryGuildService;
  friendshipService: InMemoryFriendshipService;
  presenceService: InMemoryPresenceService;
}

/** Ambiente fictício e efêmero; cada montagem recebe instâncias independentes. */
export async function createLocalAppServices(): Promise<LocalAppServices> {
  const authService = new MockAuthService();
  const chatService = new DesktopChatService();
  const mediaService = new MockMediaService();
  const callController = new DesktopCallController();
  const guildService = new InMemoryGuildService();
  const friendshipService = new InMemoryFriendshipService();
  const presenceService = new InMemoryPresenceService();

  const user = await authService.login('amigo-1');
  if (!user) throw new Error('Não foi possível iniciar a sessão local fictícia');
  const guild = await guildService.createGuild({ name: 'Comunidade dos Amigos', ownerId: user.id });
  guildService.addMemberDirect(guild.id, 'user-2');
  guildService.addMemberDirect(guild.id, 'user-3');
  const [general] = await guildService.getGuildChannels(guild.id, user.id);
  await guildService.createChannel({ guildId: guild.id, actorId: user.id, name: 'avisos', type: 'text' });
  await guildService.createChannel({ guildId: guild.id, actorId: user.id, name: 'Voz Principal', type: 'voice' });

  await friendshipService.sendFriendRequest(user.id, 'user-2');
  await friendshipService.acceptFriendRequest('user-2', user.id);
  await friendshipService.sendFriendRequest('user-3', user.id);
  presenceService.setPresence('user-2', 'online');
  await chatService.sendMessage({
    channelId: general.id,
    authorId: 'user-2',
    authorName: 'Amigo Dois',
    content: 'Mensagem fictícia de demonstração. Os dados locais são descartados ao fechar o aplicativo.'
  });

  return { authService, chatService, mediaService, callController, guildService, friendshipService, presenceService };
}
