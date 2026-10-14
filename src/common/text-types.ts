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
