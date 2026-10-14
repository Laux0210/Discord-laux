import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryFriendshipService } from '../../src/renderer/src/services/friendship-service';

describe('InMemoryFriendshipService - Amizades e Bloqueios', () => {
  let service: InMemoryFriendshipService;
  const userA = 'user-alice';
  const userB = 'user-bob';
  const userC = 'user-charlie';

  beforeEach(() => {
    service = new InMemoryFriendshipService();
  });

  it('rejeita pedido de amizade para o próprio usuário', async () => {
    await expect(
      service.sendFriendRequest(userA, userA)
    ).rejects.toThrow(/AUTO_AMIZADE_INVALIDA/i);
  });

  it('cria pedido de amizade com status pending', async () => {
    const req = await service.sendFriendRequest(userA, userB);
    expect(req.status).toBe('pending');
    expect(req.userId).toBe(userA);
    expect(req.friendId).toBe(userB);

    const friendsA = await service.getFriends(userA);
    expect(friendsA).toEqual([{ friendId: userB, status: 'pending' }]);

    const friendsB = await service.getFriends(userB);
    expect(friendsB).toEqual([{ friendId: userA, status: 'pending' }]);
  });

  it('aceita pedido de amizade pendente transicionando para accepted', async () => {
    await service.sendFriendRequest(userA, userB);
    const accepted = await service.acceptFriendRequest(userB, userA);
    expect(accepted.status).toBe('accepted');

    const friendsA = await service.getFriends(userA);
    expect(friendsA).toEqual([{ friendId: userB, status: 'accepted' }]);
  });

  it('auto-aceita amizade quando o outro usuário já enviou pedido pendente', async () => {
    await service.sendFriendRequest(userA, userB);
    // userB envia pedido para userA -> detecta reciprocidade e aceita direto
    const reqB = await service.sendFriendRequest(userB, userA);
    expect(reqB.status).toBe('accepted');

    const friendsA = await service.getFriends(userA);
    expect(friendsA[0].status).toBe('accepted');
  });

  it('remove amizade existente', async () => {
    await service.sendFriendRequest(userA, userB);
    await service.acceptFriendRequest(userB, userA);

    const removed = await service.removeFriendship(userA, userB);
    expect(removed).toBe(true);

    const friendsA = await service.getFriends(userA);
    expect(friendsA.length).toBe(0);
  });

  it('bloqueio mútuo cancela amizade ativa e remove pedidos pendentes', async () => {
    await service.sendFriendRequest(userA, userB);
    await service.acceptFriendRequest(userB, userA);

    await service.blockUser(userA, userB);
    expect(await service.isBlocked(userA, userB)).toBe(true);
    expect(await service.isBlocked(userB, userA)).toBe(true);

    // Amizade foi removida
    const friendsA = await service.getFriends(userA);
    expect(friendsA.length).toBe(0);

    const friendsB = await service.getFriends(userB);
    expect(friendsB.length).toBe(0);
  });

  it('impede novos pedidos de amizade enquanto houver bloqueio', async () => {
    await service.blockUser(userA, userB);

    // Bloqueado tentando adicionar quem o bloqueou
    await expect(
      service.sendFriendRequest(userB, userA)
    ).rejects.toThrow(/BLOQUEIO_ATIVO/i);

    // Bloqueador tentando adicionar bloqueado sem desbloquear antes
    await expect(
      service.sendFriendRequest(userA, userB)
    ).rejects.toThrow(/BLOQUEIO_ATIVO/i);
  });

  it('desbloqueio permite restabelecer relações', async () => {
    await service.blockUser(userA, userB);
    expect(await service.isBlocked(userA, userB)).toBe(true);

    await service.unblockUser(userA, userB);
    expect(await service.isBlocked(userA, userB)).toBe(false);

    // Agora pode enviar pedido novamente
    const req = await service.sendFriendRequest(userA, userB);
    expect(req.status).toBe('pending');
  });
});
