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

import { readSnapshot, storageService, type StorageAdapter } from './storage-service';

const CHAT_STORAGE_KEY = 'discord_laux_v1_chat_state';

export class DesktopChatService implements TextChatService {
  private messages: ExtendedMessage[] = [];
  private listeners: Map<string, Set<(msg: Message) => void>> = new Map();

  constructor(initialMessages?: ExtendedMessage[], private storage?: StorageAdapter) {
    if (initialMessages) {
      this.messages = [...initialMessages];
    } else if (storage) {
      const snapshot = readSnapshot<ExtendedMessage[]>(storage, CHAT_STORAGE_KEY);
      if (snapshot) {
        if (!Array.isArray(snapshot) || snapshot.some(message => !message || typeof message.channelId !== 'string' || typeof message.content !== 'string' || typeof message.createdAt !== 'number')) {
          throw new Error('ARMAZENAMENTO_INVALIDO: mensagens; dados preservados para recuperação');
        }
        this.messages = snapshot.filter(message => message.createdAt >= Date.now() - RETENTION_PERIOD_MS);
      } else {
        // Preserva IDs legados: não mistura canais antigos sem um mapeamento confiável.
        const raw = storage.getItem('discord_laux_v1_channel_messages');
        if (raw) {
          try {
            const legacy = JSON.parse(raw);
            const messages = Object.values(legacy).flat() as ExtendedMessage[];
            if (messages.some(message => !message || typeof message.channelId !== 'string' || typeof message.content !== 'string' || typeof message.createdAt !== 'number')) throw new Error();
            this.messages = messages;
          } catch { throw new Error('ARMAZENAMENTO_INVALIDO: histórico legado preservado para recuperação'); }
        }
      }
    } else {
      const allStored = storageService.getAllChannelMessages();
      for (const channelId in allStored) {
        this.messages.push(...allStored[channelId]);
      }
    }
  }

  private persistMessages(messages: ExtendedMessage[]): void {
    if (this.storage) {
      this.storage.setItem(CHAT_STORAGE_KEY, JSON.stringify({
        version: 1,
        data: messages.filter(message => message.createdAt >= Date.now() - RETENTION_PERIOD_MS)
      }));
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
          !m.isDeleted && m.createdAt >= Date.now() - RETENTION_PERIOD_MS
      );
      if (existing) {
        return { ...existing };
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

    this.persistMessages([...this.messages, message]);
    if (!this.storage) storageService.saveChannelMessage(params.channelId, message);
    this.messages.push(message);

    const channelListeners = this.listeners.get(params.channelId);
    if (channelListeners) {
      for (const listener of channelListeners) {
        try { listener({ ...message }); } catch { /* Consumidor não desfaz envio persistido. */ }
      }
    }

    return { ...message };
  }

  public receiveRemoteMessage(message: ExtendedMessage): void {
    const existing = this.messages.find(
      (m) => m.id === message.id || (message.nonce && m.nonce === message.nonce && m.channelId === message.channelId && m.authorId === message.authorId)
    );
    if (existing) return;

    this.persistMessages([...this.messages, message]);
    if (!this.storage) storageService.saveChannelMessage(message.channelId, message);
    this.messages.push({ ...message });

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

    return filtered.map(message => ({ ...message }));
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

    const next = this.messages.map(message => message.id === msg.id ? { ...message, isDeleted: true } : message);
    this.persistMessages(next);
    if (!this.storage) storageService.saveAllChannelMessages(msg.channelId, next.filter((m) => m.channelId === msg.channelId));
    this.messages = next;
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
