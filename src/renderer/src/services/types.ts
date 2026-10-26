import type { User, Message, VoiceParticipant } from '../../../common/types';

export interface AuthService {
  login(username: string): Promise<User | null>;
  loginWithCredentials?(email: string, password: string, isSignUp?: boolean, displayName?: string): Promise<User | null>;
  loginWithGoogle?(): Promise<User | null>;
  logout(): Promise<void>;
  getCurrentUser(): User | null;
}

export interface SendMessageParams {
  channelId: string;
  authorId: string;
  authorName: string;
  content: string;
}

export interface DeleteMessageParams {
  messageId: string;
  requesterId: string;
  permissions: bigint;
}

export interface ChatService {
  sendMessage(params: SendMessageParams): Promise<Message>;
  getMessages(channelId: string): Promise<Message[]>;
  deleteMessage(params: DeleteMessageParams): Promise<boolean>;
  onNewMessage(channelId: string, callback: (msg: Message) => void): () => void;
  /** Snapshot autoritativo: inclui exclusões e revogação de acesso. */
  onMessagesUpdated?(channelId: string, callback: (messages: Message[]) => void): () => void;
}

export interface MediaService {
  joinCall(userId: string, displayName: string): Promise<boolean>;
  leaveCall(userId: string): Promise<void>;
  startScreenShare(userId: string): Promise<boolean>;
  stopScreenShare(userId: string): Promise<void>;
  setMute(userId: string, isMuted: boolean): Promise<void>;
  setDeafen(userId: string, isDeafened: boolean): Promise<void>;
  getParticipants(): VoiceParticipant[];
  onParticipantsUpdated(callback: (participants: VoiceParticipant[]) => void): () => void;
}
