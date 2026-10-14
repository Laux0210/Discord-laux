/**
 * Tipos de domínio canônicos do Discord Desktop
 */

export interface User {
  id: string;
  username: string;
  discriminator?: string;
  displayName: string;
  avatarUrl?: string;
  isBot?: boolean;
}

export interface Guild {
  id: string;
  name: string;
  ownerId: string;
  iconUrl?: string;
}

export interface GuildMember {
  userId: string;
  guildId: string;
  nickname?: string;
  roleIds: string[];
}

export interface Role {
  id: string;
  name: string;
  position: number;
  permissions: bigint;
  color?: string;
}

export type OverrideTargetType = 'role' | 'member';

export interface ChannelOverride {
  targetId: string;
  targetType: OverrideTargetType;
  allow: bigint;
  deny: bigint;
}

export type ChannelType = 'text' | 'voice';

export interface Channel {
  id: string;
  guildId: string;
  name: string;
  type?: ChannelType;
  topic?: string;
  position?: number;
  overrides?: ChannelOverride[];
}

export interface Message {
  id: string;
  channelId: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: number; // Unix epoch ms
  updatedAt?: number;
  isDeleted?: boolean;
}

export interface VoiceParticipant {
  userId: string;
  displayName: string;
  isMuted: boolean;
  isDeafened: boolean;
  isScreenSharing: boolean;
  joinedAt: number;
}
