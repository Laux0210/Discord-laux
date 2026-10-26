import type { Guild, GuildMember, Channel, Role, ChannelType } from './types';

export interface CreateGuildParams {
  name: string;
  ownerId: string;
  iconUrl?: string;
}

export interface CreateChannelParams {
  guildId: string;
  name: string;
  type: ChannelType;
  actorId: string;
  topic?: string;
}

export interface CreateInviteParams {
  guildId: string;
  creatorId: string;
  maxUses?: number;
  expiresInMs?: number;
}

export interface InviteInfo {
  code: string;
  guildId: string;
  guildName: string;
  creatorId: string;
  expiresAt: number | null; // epoch ms
  maxUses: number | null;
  uses: number;
}

export interface CreateRoleParams {
  guildId: string;
  name: string;
  position: number;
  permissions: bigint;
  color?: string;
  actorId: string;
}

export interface AssignRoleParams {
  guildId: string;
  targetUserId: string;
  roleId: string;
  actorId: string;
}

export interface GuildService {
  ensureCommonGuild?(userId: string, ownerId?: string): Promise<Guild>;
  getGuildRoles?(guildId: string): Promise<Role[]>;
  getMemberPermissions?(guildId: string, userId: string, channelId?: string): Promise<bigint>;
  createGuild(params: CreateGuildParams): Promise<Guild>;
  getGuild(guildId: string): Promise<Guild | null>;
  getUserGuilds(userId: string): Promise<Guild[]>;
  getGuildMembers(guildId: string): Promise<GuildMember[]>;
  createChannel(params: CreateChannelParams): Promise<Channel>;
  deleteChannel(channelId: string, actorId: string): Promise<boolean>;
  getGuildChannels(guildId: string, actorId: string): Promise<Channel[]>;
  createInvite(params: CreateInviteParams): Promise<InviteInfo>;
  getInvite(code: string): Promise<InviteInfo | null>;
  joinGuildByInvite(code: string, userId: string): Promise<Guild>;
  createRole(params: CreateRoleParams): Promise<Role>;
  assignRole(params: AssignRoleParams): Promise<boolean>;
  removeRole(params: AssignRoleParams): Promise<boolean>;
}
