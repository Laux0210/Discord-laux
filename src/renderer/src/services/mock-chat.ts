import type { Message } from '../../../common/types';
import { PermissionFlags, hasPermission } from '../../../common/permissions';
import type { ChatService, SendMessageParams, DeleteMessageParams } from './types';

// Janela estrita de 10 dias em milissegundos (D-07)
export const RETENTION_PERIOD_MS = 10 * 24 * 60 * 60 * 1000;

export class MockChatService implements ChatService {
  private messages: Message[] = [];
  private listeners: Map<string, Set<(msg: Message) => void>> = new Map();

  async sendMessage(params: SendMessageParams): Promise<Message> {
    const message: Message = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      channelId: params.channelId,
      authorId: params.authorId,
      authorName: params.authorName,
      content: params.content,
      createdAt: Date.now()
    };

    this.messages.push(message);

    const channelListeners = this.listeners.get(params.channelId);
    if (channelListeners) {
      for (const listener of channelListeners) {
        listener(message);
      }
    }

    return message;
  }

  async getMessages(channelId: string): Promise<Message[]> {
    const cutoff = Date.now() - RETENTION_PERIOD_MS;

    // Filtra por canal, não-deletadas e estritamente dentro da janela de 10 dias
    return this.messages.filter(
      (m) => m.channelId === channelId && !m.isDeleted && m.createdAt >= cutoff
    );
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

  // Método auxiliar exclusivo para testes de borda de retenção
  async injectMessageForTesting(message: Message): Promise<void> {
    this.messages.push(message);
  }
}
