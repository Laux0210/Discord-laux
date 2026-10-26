import { MockAuthService } from './mock-auth';
import { DesktopChatService } from './desktop-chat-service';
import { MockMediaService } from './mock-media';
import { DesktopCallController } from './desktop-call-controller';
import { InMemoryGuildService } from './guild-service';
import { InMemoryFriendshipService } from './friendship-service';
import { InMemoryPresenceService } from './presence-service';
import { browserStorageAdapter, StorageService, storageService, type StorageAdapter } from './storage-service';

export interface LocalAppServices {
  authService: MockAuthService;
  chatService: DesktopChatService;
  mediaService: MockMediaService;
  callController: DesktopCallController;
  guildService: InMemoryGuildService;
  friendshipService: InMemoryFriendshipService;
  presenceService: InMemoryPresenceService;
}

/** Dados locais persistem no navegador; sem DOM mantém fixtures isoladas para testes. */
export async function createLocalAppServices(options?: { storage?: StorageAdapter }): Promise<LocalAppServices> {
  const storage = options?.storage ?? (typeof window !== 'undefined' ? browserStorageAdapter : undefined);
  const freshCommunity = !storage?.getItem('discord_laux_v1_guild_state');
  const authService = new MockAuthService();
  const chatService = new DesktopChatService(storage ? undefined : [], storage);
  const mediaService = new MockMediaService();
  const callController = new DesktopCallController();
  const guildService = new InMemoryGuildService(storage);
  const friendshipService = new InMemoryFriendshipService(storage);
  const presenceService = new InMemoryPresenceService();

  let user = storageService.getCurrentUser();
  if (!user) {
    user = await authService.login('amigo-1');
  } else {
    authService.setCurrentUser(user);
  }

  if (!user) throw new Error('Não foi possível iniciar a sessão local fictícia');
  const guild = await guildService.ensureCommonGuild(user.id);
  if (freshCommunity) {
    guildService.addMemberDirect(guild.id, 'user-2');
    guildService.addMemberDirect(guild.id, 'user-3');
  }
  if (storage) {
    const legacyMessages = new StorageService(storage).getAllChannelMessages();
    guildService.recoverLegacyTextChannels(Object.keys(legacyMessages).filter(id => legacyMessages[id].length > 0), guild.ownerId);
  }
  const [general] = await guildService.getGuildChannels(guild.id, user.id);

  if (freshCommunity && user.id === 'user-1') {
    await friendshipService.sendFriendRequest('user-1', 'user-2');
    await friendshipService.acceptFriendRequest('user-2', 'user-1');
    await friendshipService.sendFriendRequest('user-3', 'user-1');
  }
  presenceService.setPresence('user-2', 'online');

  const existingMessages = await chatService.getMessages(general.id);
  if (freshCommunity && general && existingMessages.length === 0) {
    await chatService.sendMessage({
      channelId: general.id,
      authorId: 'user-2',
      authorName: 'Amigo Dois',
      content: 'Mensagem fictícia de demonstração. Bem-vindo! Suas conversas e configurações ficam salvas mesmo ao atualizar a página.'
    });
  }

  return { authService, chatService, mediaService, callController, guildService, friendshipService, presenceService };
}
