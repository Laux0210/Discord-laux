import type {
  Block,
  DmChannel,
  DmMessage,
  Friendship,
  FriendshipService,
  FriendshipStatus,
  PaginationParams,
  SendDmParams
} from '../../../common/text-types';
import { readSnapshot, type StorageAdapter } from './storage-service';

const FRIENDSHIP_STORAGE_KEY = 'discord_laux_v1_friendship_state';
interface FriendshipSnapshot {
  friendships: [string, Friendship][];
  blocks: string[];
  dmChannels: [string, DmChannel][];
  dmMessages: DmMessage[];
}

export const RETENTION_PERIOD_MS = 10 * 24 * 60 * 60 * 1000; // 10 dias

function sortPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

function copyDmChannel(dm: DmChannel): DmChannel {
  return { ...dm, participantIds: [...dm.participantIds] };
}

export class InMemoryFriendshipService implements FriendshipService {
  private friendships = new Map<string, Friendship>(); // key: `${sortedPair}` -> Friendship
  private blocks = new Set<string>(); // `${blockerId}:${blockedId}`
  private dmChannels = new Map<string, DmChannel>(); // dmChannelId -> DmChannel
  private dmMessages: (DmMessage & { nonce?: string })[] = [];
  private dmListeners = new Map<string, Set<{ requesterId: string; callback: () => void }>>();

  private committed: FriendshipSnapshot;

  constructor(private storage?: StorageAdapter) {
    const stored = readSnapshot<FriendshipSnapshot>(storage, FRIENDSHIP_STORAGE_KEY);
    if (stored) {
      try { this.restore(stored); }
      catch { throw new Error('ARMAZENAMENTO_INVALIDO: amizades; dados preservados para recuperação'); }
    }
    this.committed = this.snapshot();
  }

  private snapshot(): FriendshipSnapshot {
    return JSON.parse(JSON.stringify({
      friendships: [...this.friendships], blocks: [...this.blocks],
      dmChannels: [...this.dmChannels],
      dmMessages: this.dmMessages.filter(message => message.createdAt > Date.now() - RETENTION_PERIOD_MS)
    }));
  }

  private restore(value: FriendshipSnapshot): void {
    const snapshot: FriendshipSnapshot = JSON.parse(JSON.stringify(value));
    this.friendships = new Map(snapshot.friendships);
    this.blocks = new Set(snapshot.blocks);
    this.dmChannels = new Map(snapshot.dmChannels);
    this.dmMessages = snapshot.dmMessages.filter(message => message.createdAt > Date.now() - RETENTION_PERIOD_MS);
  }

  private persist(): void {
    const next = this.snapshot();
    try { this.storage?.setItem(FRIENDSHIP_STORAGE_KEY, JSON.stringify({ version: 1, data: next })); }
    catch (error) { this.restore(this.committed); throw error; }
    this.committed = next;
  }

  private hasBlock(userA: string, userB: string): boolean {
    return this.blocks.has(`${userA}:${userB}`) || this.blocks.has(`${userB}:${userA}`);
  }

  private assertDmPairAccess(userA: string, userB: string): void {
    if (this.hasBlock(userA, userB)) {
      throw new Error('BLOQUEIO_ATIVO: interação direta bloqueada');
    }
    const friendship = this.friendships.get(sortPair(userA, userB).join(':'));
    if (!friendship || friendship.status !== 'accepted') {
      throw new Error('AMIZADE_NECESSARIA_PARA_DM: DMs só são permitidas entre amigos aceitos');
    }
  }

  private assertDmAccess(dmChannelId: string, requesterId: string): DmChannel {
    const dm = this.dmChannels.get(dmChannelId);
    if (!dm) throw new Error('DM_NAO_ENCONTRADA: canal de DM não existe');
    if (!dm.participantIds.includes(requesterId)) {
      throw new Error('ACESSO_NEGADO_DM: você não tem permissão para acessar esta DM');
    }
    this.assertDmPairAccess(...dm.participantIds);
    return dm;
  }

  private canAccessDm(dmChannelId: string, requesterId: string): boolean {
    try {
      this.assertDmAccess(dmChannelId, requesterId);
      return true;
    } catch {
      return false;
    }
  }

  private emitDmUpdated(dmChannelId: string): void {
    const listeners = this.dmListeners.get(dmChannelId);
    if (!listeners) return;
    for (const listener of [...listeners]) {
      if (!listeners.has(listener)) continue;
      // Uma invalidação final permite limpar a UI. A assinatura revogada não recebe eventos futuros.
      if (!this.canAccessDm(dmChannelId, listener.requesterId)) listeners.delete(listener);
      try {
        listener.callback();
      } catch {
        // Uma falha de consumidor não desfaz a alteração já aplicada nem interrompe outros ouvintes.
      }
    }
    if (listeners.size === 0 && this.dmListeners.get(dmChannelId) === listeners) {
      this.dmListeners.delete(dmChannelId);
    }
  }

  private invalidatePairDms(userA: string, userB: string): void {
    for (const dm of this.dmChannels.values()) {
      if (dm.participantIds.includes(userA) && dm.participantIds.includes(userB)) {
        this.emitDmUpdated(dm.id);
      }
    }
  }

  onDmUpdated(dmChannelId: string, requesterId: string, callback: () => void): () => void {
    this.assertDmAccess(dmChannelId, requesterId);
    const listeners = this.dmListeners.get(dmChannelId) ?? new Set();
    const listener = { requesterId, callback };
    listeners.add(listener);
    this.dmListeners.set(dmChannelId, listeners);
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0 && this.dmListeners.get(dmChannelId) === listeners) {
        this.dmListeners.delete(dmChannelId);
      }
    };
  }

  async sendFriendRequest(requesterId: string, targetUserId: string): Promise<Friendship> {
    if (!requesterId || !targetUserId || requesterId.includes(':') || targetUserId.includes(':')) {
      throw new Error('IDENTIDADE_INVALIDA');
    }
    if (requesterId === targetUserId) {
      throw new Error('AUTO_AMIZADE_INVALIDA: não é possível adicionar a si mesmo');
    }

    if (await this.isBlocked(requesterId, targetUserId)) {
      throw new Error('BLOQUEIO_ATIVO: não é possível interagir com usuário bloqueado');
    }

    const key = sortPair(requesterId, targetUserId).join(':');
    const existing = this.friendships.get(key);

    if (existing) {
      // Se já houver um pedido pendente feito pelo outro usuário, aceita direto!
      if (existing.status === 'pending' && existing.userId === targetUserId) {
        existing.status = 'accepted';
        this.persist();
        return { ...existing };
      }
      return { ...existing };
    }

    const friendship: Friendship = {
      userId: requesterId,
      friendId: targetUserId,
      status: 'pending',
      createdAt: Date.now()
    };

    this.friendships.set(key, friendship);
    this.persist();
    return { ...friendship };
  }

  async acceptFriendRequest(userId: string, friendId: string): Promise<Friendship> {
    const key = sortPair(userId, friendId).join(':');
    const existing = this.friendships.get(key);

    if (!existing) {
      throw new Error('PEDIDO_AMIZADE_NAO_ENCONTRADO');
    }

    if (existing.status === 'pending' && existing.friendId !== userId) {
      throw new Error('APENAS_DESTINATARIO: somente quem recebeu pode aceitar o pedido');
    }
    if (this.hasBlock(userId, friendId)) throw new Error('BLOQUEIO_ATIVO');

    existing.status = 'accepted';
    this.persist();
    return { ...existing };
  }

  async removeFriendship(userA: string, userB: string): Promise<boolean> {
    const key = sortPair(userA, userB).join(':');
    const removed = this.friendships.delete(key);
    this.persist();
    if (removed) this.invalidatePairDms(userA, userB);
    return removed;
  }

  async getFriends(userId: string, includeDirection = false): Promise<{ friendId: string; status: FriendshipStatus; direction?: 'incoming' | 'outgoing' }[]> {
    const result: { friendId: string; status: FriendshipStatus; direction?: 'incoming' | 'outgoing' }[] = [];
    for (const friendship of this.friendships.values()) {
      if (friendship.userId !== userId && friendship.friendId !== userId) continue;
      const outgoing = friendship.userId === userId;
      result.push({
        friendId: outgoing ? friendship.friendId : friendship.userId,
        status: friendship.status,
        ...(includeDirection && friendship.status === 'pending' ? { direction: outgoing ? 'outgoing' as const : 'incoming' as const } : {})
      });
    }
    return result;
  }

  async blockUser(blockerId: string, blockedId: string): Promise<Block> {
    if (blockerId === blockedId) {
      throw new Error('AUTO_BLOQUEIO_INVALIDO: não é possível bloquear a si mesmo');
    }

    const block: Block = {
      blockerId,
      blockedId,
      createdAt: Date.now()
    };

    this.blocks.add(`${blockerId}:${blockedId}`);
    // O bloqueio e a remoção ficam visíveis juntos antes de qualquer callback ou yield.
    this.friendships.delete(sortPair(blockerId, blockedId).join(':'));
    this.persist();
    this.invalidatePairDms(blockerId, blockedId);
    return block;
  }

  async unblockUser(blockerId: string, blockedId: string): Promise<boolean> {
    const removed = this.blocks.delete(`${blockerId}:${blockedId}`);
    this.persist();
    return removed;
  }

  async isBlocked(userA: string, userB: string): Promise<boolean> {
    return this.hasBlock(userA, userB);
  }

  async getOrCreateDmChannel(userA: string, userB: string): Promise<DmChannel> {
    if (userA === userB) {
      throw new Error('DM_INVALIDA_MESMO_USUARIO');
    }

    this.assertDmPairAccess(userA, userB);

    // Procura DM existente
    for (const dm of this.dmChannels.values()) {
      if (dm.participantIds.includes(userA) && dm.participantIds.includes(userB)) {
        return copyDmChannel(dm);
      }
    }

    const newDm: DmChannel = {
      id: `dm-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      participantIds: [userA, userB],
      createdAt: Date.now()
    };

    this.dmChannels.set(newDm.id, newDm);
    this.persist();
    return copyDmChannel(newDm);
  }

  async getDmChannel(dmChannelId: string, requesterId: string): Promise<DmChannel | null> {
    const dm = this.dmChannels.get(dmChannelId);
    if (!dm) return null;

    return copyDmChannel(this.assertDmAccess(dmChannelId, requesterId));
  }

  async getUserDms(userId: string): Promise<DmChannel[]> {
    const list: DmChannel[] = [];
    for (const dm of this.dmChannels.values()) {
      if (this.canAccessDm(dm.id, userId)) {
        list.push(copyDmChannel(dm));
      }
    }
    return list;
  }

  async sendDmMessage(params: SendDmParams): Promise<DmMessage> {
    this.assertDmAccess(params.dmChannelId, params.authorId);

    const trimmed = params.content ? params.content.trim() : '';
    if (trimmed.length === 0) {
      throw new Error('CONTEUDO_VAZIO: mensagem de DM não pode ser vazia');
    }
    if (params.content.length > 2000) {
      throw new Error('CONTEUDO_EXCEDE_LIMITE: mensagem de DM excede 2000 caracteres');
    }

    // Idempotência por nonce
    const cutoff = Date.now() - RETENTION_PERIOD_MS;
    if (params.nonce) {
      const existing = this.dmMessages.find(
        (m) =>
          m.dmChannelId === params.dmChannelId &&
          m.authorId === params.authorId &&
          m.nonce === params.nonce &&
            !m.isDeleted && m.createdAt > cutoff
      );
      if (existing) {
          return { ...existing };
      }
    }

    const message: DmMessage & { nonce?: string } = {
      id: `dmsg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      dmChannelId: params.dmChannelId,
      authorId: params.authorId,
      authorName: params.authorName,
      content: params.content,
      createdAt: Date.now(),
      nonce: params.nonce
    };

    this.dmMessages.push(message);
    this.persist();
    this.emitDmUpdated(params.dmChannelId);
    return { ...message };
  }

  async getDmMessages(
    dmChannelId: string,
    requesterId: string,
    pagination?: PaginationParams
  ): Promise<DmMessage[]> {
    this.assertDmAccess(dmChannelId, requesterId);

    const cutoff = Date.now() - RETENTION_PERIOD_MS;
    let filtered = this.dmMessages.filter(
      (m) => m.dmChannelId === dmChannelId && !m.isDeleted && m.createdAt > cutoff
    );

    if (pagination?.before !== undefined) {
      filtered = filtered.filter((m) => m.createdAt < pagination.before!);
    }

    filtered.sort((a, b) => a.createdAt - b.createdAt);

    const limit = pagination?.limit ?? 50;
    if (filtered.length > limit) {
      filtered = filtered.slice(filtered.length - limit);
    }

    return filtered.map((message) => ({ ...message }));
  }
}
