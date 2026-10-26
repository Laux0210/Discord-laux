import type { Message } from './types';

export interface PaginationParams {
  limit?: number;
  before?: number; // timestamp ms cursor
}

export interface SendChannelMessageParams {
  channelId: string;
  authorId: string;
  authorName: string;
  content: string;
  nonce?: string;
}

export interface DeleteMessageParams {
  messageId: string;
  requesterId: string;
  permissions: bigint;
}

export type FriendshipStatus = 'pending' | 'accepted';

export interface Friendship {
  userId: string;
  friendId: string;
  status: FriendshipStatus;
  createdAt: number;
}

export interface Block {
  blockerId: string;
  blockedId: string;
  createdAt: number;
}

export interface DmChannel {
  id: string;
  participantIds: [string, string];
  createdAt: number;
}

export interface DmMessage {
  id: string;
  dmChannelId: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: number;
  isDeleted?: boolean;
  nonce?: string;
}

export interface SendDmParams {
  dmChannelId: string;
  authorId: string;
  authorName: string;
  content: string;
  nonce?: string;
}

export type PresenceStatus = 'online' | 'idle' | 'offline';

export interface UserPresence {
  userId: string;
  status: PresenceStatus;
  lastSeen: number;
}

export interface TextChatService {
  sendMessage(params: SendChannelMessageParams): Promise<Message>;
  getMessages(channelId: string, pagination?: PaginationParams): Promise<Message[]>;
  deleteMessage(params: DeleteMessageParams): Promise<boolean>;
  onNewMessage(channelId: string, callback: (msg: Message) => void): () => void;
}

export interface FriendshipService {
  sendFriendRequest(requesterId: string, targetUserId: string): Promise<Friendship>;
  acceptFriendRequest(userId: string, friendId: string): Promise<Friendship>;
  removeFriendship(userA: string, userB: string): Promise<boolean>;
  getFriends(userId: string, includeDirection?: boolean): Promise<{ friendId: string; status: FriendshipStatus; direction?: 'incoming' | 'outgoing' }[]>;
  blockUser(blockerId: string, blockedId: string): Promise<Block>;
  unblockUser(blockerId: string, blockedId: string): Promise<boolean>;
  isBlocked(userA: string, userB: string): Promise<boolean>;
  getOrCreateDmChannel(userA: string, userB: string): Promise<DmChannel>;
  getDmChannel(dmChannelId: string, requesterId: string): Promise<DmChannel | null>;
  getUserDms(userId: string): Promise<DmChannel[]>;
  sendDmMessage(params: SendDmParams): Promise<DmMessage>;
  getDmMessages(dmChannelId: string, requesterId: string, pagination?: PaginationParams): Promise<DmMessage[]>;
  /** Invalida a leitura sem payload; a revogação emite uma última invalidação e encerra a assinatura. */
  onDmUpdated?(dmChannelId: string, requesterId: string, callback: () => void): () => void;
}

export interface PresenceService {
  setPresence(userId: string, status: PresenceStatus): void;
  heartbeat(userId: string): void;
  getPresence(userId: string): PresenceStatus;
  onPresenceUpdate(callback: (presence: UserPresence) => void): () => void;
}
