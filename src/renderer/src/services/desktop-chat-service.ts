import type { Message } from '../../../common/types';
import type {
  DeleteMessageParams,
  PaginationParams,
  SendChannelMessageParams,
  TextChatService
} from '../../../common/text-types';
import { PermissionFlags, hasPermission } from '../../../common/permissions';

export const RETENTION_PERIOD_MS = 10 * 24 * 60 * 60 * 1000; // 10 dias

interface ExtendedMessage extends Message {
  nonce?: string;
}

import { storageService } from './storage-service';

export class DesktopChatService implements TextChatService {
  private messages: ExtendedMessage[] = [];
  private listeners: Map<string, Set<(msg: Message) => void>> = new Map();

  constructor(initialMessages?: ExtendedMessage[]) {
    if (initialMessages) {
      this.messages = [...initialMessages];
    } else {
      const allStored = storageService.getAllChannelMessages();
      for (const channelId in allStored) {
        this.messages.push(...allStored[channelId]);
      }
    }
  }

  async sendMessage(params: SendChannelMessageParams): Promise<Message> {
    const trimmed = params.content ? params.content.trim() : '';
    if (trimmed.length === 0) {
      throw new Error('CONTEUDO_VAZIO: mensagem não pode ser vazia');
    }
    if (params.content.length > 2000) {
      throw new Error('CONTEUDO_EXCEDE_LIMITE: mensagem excede 2000 caracteres');
    }

    // Verificação de idempotência por nonce
    if (params.nonce) {
      const existing = this.messages.find(
        (m) =>
          m.channelId === params.channelId &&
          m.authorId === params.authorId &&
          m.nonce === params.nonce &&
          !m.isDeleted
      );
      if (existing) {
        return existing;
      }
    }

    const message: ExtendedMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      channelId: params.channelId,
      authorId: params.authorId,
      authorName: params.authorName,
      content: params.content,
      createdAt: Date.now(),
      nonce: params.nonce
    };

    this.messages.push(message);
    storageService.saveChannelMessage(params.channelId, message);

    const channelListeners = this.listeners.get(params.channelId);
    if (channelListeners) {
      for (const listener of channelListeners) {
        listener(message);
      }
    }

    return message;
  }

  public receiveRemoteMessage(message: ExtendedMessage): void {
    const existing = this.messages.find(
      (m) => m.id === message.id || (message.nonce && m.nonce === message.nonce)
    );
    if (existing) return;

    this.messages.push(message);
    storageService.saveChannelMessage(message.channelId, message);

    const channelListeners = this.listeners.get(message.channelId);
    if (channelListeners) {
      for (const listener of channelListeners) {
        try {
          listener(message);
        } catch (err) {
          console.error('Erro no listener de chat:', err);
        }
      }
    }
  }

  async getMessages(channelId: string, pagination?: PaginationParams): Promise<Message[]> {
    const cutoff = Date.now() - RETENTION_PERIOD_MS;

    let filtered = this.messages.filter(
      (m) => m.channelId === channelId && !m.isDeleted && m.createdAt >= cutoff
    );

    if (pagination?.before !== undefined) {
      filtered = filtered.filter((m) => m.createdAt < pagination.before!);
    }

    // Ordenação cronológica crescente
    filtered.sort((a, b) => a.createdAt - b.createdAt);

    const limit = pagination?.limit ?? 50;
    if (filtered.length > limit) {
      // Retorna as 'limit' mensagens mais recentes dentro do filtro
      filtered = filtered.slice(filtered.length - limit);
    }

    return filtered;
  }

  async deleteMessage(params: DeleteMessageParams): Promise<boolean> {
    const msg = this.messages.find((m) => m.id === params.messageId);
    if (!msg || msg.isDeleted) {
      return false;
    }

    const isAuthor = msg.authorId === params.requesterId;
    const canManage = hasPermission(params.permissions, PermissionFlags.MANAGE_MESSAGES);

    if (!isAuthor && !canManage) {
      return false;
    }

    msg.isDeleted = true;
    storageService.saveAllChannelMessages(msg.channelId, this.messages.filter((m) => m.channelId === msg.channelId));
    return true;
  }

  onNewMessage(channelId: string, callback: (msg: Message) => void): () => void {
    if (!this.listeners.has(channelId)) {
      this.listeners.set(channelId, new Set());
    }

    const set = this.listeners.get(channelId)!;
    set.add(callback);

    return () => {
      set.delete(callback);
    };
  }

  async injectMessageForTesting(message: ExtendedMessage): Promise<void> {
    this.messages.push(message);
  }
}
