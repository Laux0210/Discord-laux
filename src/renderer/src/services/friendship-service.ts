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

export const RETENTION_PERIOD_MS = 10 * 24 * 60 * 60 * 1000; // 10 dias

function sortPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

export class InMemoryFriendshipService implements FriendshipService {
  private friendships = new Map<string, Friendship>(); // key: `${sortedPair}` -> Friendship
  private blocks = new Set<string>(); // `${blockerId}:${blockedId}`
  private dmChannels = new Map<string, DmChannel>(); // dmChannelId -> DmChannel
  private dmMessages: (DmMessage & { nonce?: string })[] = [];

  async sendFriendRequest(requesterId: string, targetUserId: string): Promise<Friendship> {
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
    return { ...friendship };
  }

  async acceptFriendRequest(userId: string, friendId: string): Promise<Friendship> {
    const key = sortPair(userId, friendId).join(':');
    const existing = this.friendships.get(key);

    if (!existing) {
      throw new Error('PEDIDO_AMIZADE_NAO_ENCONTRADO');
    }

    existing.status = 'accepted';
    return { ...existing };
  }

  async removeFriendship(userA: string, userB: string): Promise<boolean> {
    const key = sortPair(userA, userB).join(':');
    return this.friendships.delete(key);
  }

  async getFriends(userId: string): Promise<{ friendId: string; status: FriendshipStatus }[]> {
    const result: { friendId: string; status: FriendshipStatus }[] = [];
    for (const [key, friendship] of this.friendships.entries()) {
      const [u1, u2] = key.split(':');
      if (u1 === userId) {
        result.push({ friendId: u2, status: friendship.status });
      } else if (u2 === userId) {
        result.push({ friendId: u1, status: friendship.status });
      }
    }
    return result;
  }

  async blockUser(blockerId: string, blockedId: string): Promise<Block> {
    if (blockerId === blockedId) {
      throw new Error('AUTO_BLOQUEIO_INVALIDO: não é possível bloquear a si mesmo');
    }

    // Cancela amizades ou pedidos pendentes
    await this.removeFriendship(blockerId, blockedId);

    const block: Block = {
      blockerId,
      blockedId,
      createdAt: Date.now()
    };

    this.blocks.add(`${blockerId}:${blockedId}`);
    return block;
  }

  async unblockUser(blockerId: string, blockedId: string): Promise<boolean> {
    return this.blocks.delete(`${blockerId}:${blockedId}`);
  }

  async isBlocked(userA: string, userB: string): Promise<boolean> {
    return this.blocks.has(`${userA}:${userB}`) || this.blocks.has(`${userB}:${userA}`);
  }

  async getOrCreateDmChannel(userA: string, userB: string): Promise<DmChannel> {
    if (userA === userB) {
      throw new Error('DM_INVALIDA_MESMO_USUARIO');
    }

    if (await this.isBlocked(userA, userB)) {
      throw new Error('BLOQUEIO_ATIVO: impossível abrir DM com usuário bloqueado');
    }

    const key = sortPair(userA, userB).join(':');
    const friendship = this.friendships.get(key);
    if (!friendship || friendship.status !== 'accepted') {
      throw new Error('AMIZADE_NECESSARIA_PARA_DM: DMs só são permitidas entre amigos aceitos');
    }

    // Procura DM existente
    for (const dm of this.dmChannels.values()) {
      if (dm.participantIds.includes(userA) && dm.participantIds.includes(userB)) {
        return { ...dm };
      }
    }

    const newDm: DmChannel = {
      id: `dm-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      participantIds: [userA, userB],
      createdAt: Date.now()
    };

    this.dmChannels.set(newDm.id, newDm);
    return { ...newDm };
  }

  async getDmChannel(dmChannelId: string, requesterId: string): Promise<DmChannel | null> {
    const dm = this.dmChannels.get(dmChannelId);
    if (!dm) return null;

    if (!dm.participantIds.includes(requesterId)) {
      throw new Error('ACESSO_NEGADO_DM: você não tem permissão para acessar esta DM');
    }

    return { ...dm };
  }

  async getUserDms(userId: string): Promise<DmChannel[]> {
    const list: DmChannel[] = [];
    for (const dm of this.dmChannels.values()) {
      if (dm.participantIds.includes(userId)) {
        list.push({ ...dm });
      }
    }
    return list;
  }

  async sendDmMessage(params: SendDmParams): Promise<DmMessage> {
    const dm = this.dmChannels.get(params.dmChannelId);
    if (!dm) {
      throw new Error('DM_NAO_ENCONTRADA: canal de DM não existe');
    }

    if (!dm.participantIds.includes(params.authorId)) {
      throw new Error('ACESSO_NEGADO_DM: autor não é participante desta DM');
    }

    const otherUserId = dm.participantIds.find((id) => id !== params.authorId)!;

    if (await this.isBlocked(params.authorId, otherUserId)) {
      throw new Error('BLOQUEIO_ATIVO: mensagem direta bloqueada');
    }

    const key = sortPair(params.authorId, otherUserId).join(':');
    const friendship = this.friendships.get(key);
    if (!friendship || friendship.status !== 'accepted') {
      throw new Error('AMIZADE_NECESSARIA_PARA_DM: DMs só são permitidas entre amigos aceitos');
    }

    const trimmed = params.content ? params.content.trim() : '';
    if (trimmed.length === 0) {
      throw new Error('CONTEUDO_VAZIO: mensagem de DM não pode ser vazia');
    }
    if (params.content.length > 2000) {
      throw new Error('CONTEUDO_EXCEDE_LIMITE: mensagem de DM excede 2000 caracteres');
    }

    // Idempotência por nonce
    if (params.nonce) {
      const existing = this.dmMessages.find(
        (m) =>
          m.dmChannelId === params.dmChannelId &&
          m.authorId === params.authorId &&
          m.nonce === params.nonce &&
          !m.isDeleted
      );
      if (existing) {
        return existing;
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
    return message;
  }

  async getDmMessages(
    dmChannelId: string,
    requesterId: string,
    pagination?: PaginationParams
  ): Promise<DmMessage[]> {
    const dm = this.dmChannels.get(dmChannelId);
    if (!dm || !dm.participantIds.includes(requesterId)) {
      throw new Error('ACESSO_NEGADO_DM: você não tem permissão para acessar esta DM');
    }

    const cutoff = Date.now() - RETENTION_PERIOD_MS;
    let filtered = this.dmMessages.filter(
      (m) => m.dmChannelId === dmChannelId && !m.isDeleted && m.createdAt >= cutoff
    );

    if (pagination?.before !== undefined) {
      filtered = filtered.filter((m) => m.createdAt < pagination.before!);
    }

    filtered.sort((a, b) => a.createdAt - b.createdAt);

    const limit = pagination?.limit ?? 50;
    if (filtered.length > limit) {
      filtered = filtered.slice(filtered.length - limit);
    }

    return filtered;
  }
}
