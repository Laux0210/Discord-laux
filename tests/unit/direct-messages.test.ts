import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryFriendshipService } from '../../src/renderer/src/services/friendship-service';

describe('Direct Messages (DMs) - Isolamento e Regras Estritas', () => {
  let service: InMemoryFriendshipService;
  const userA = 'user-alice';
  const userB = 'user-bob';
  const userSpy = 'user-spy-admin';

  beforeEach(() => {
    service = new InMemoryFriendshipService();
  });

  it('permite criar e obter canal de DM apenas quando a amizade é aceita', async () => {
    // Tentativa antes de amizade -> REJEITADA
    await expect(
      service.getOrCreateDmChannel(userA, userB)
    ).rejects.toThrow(/AMIZADE_NECESSARIA_PARA_DM/i);

    // Envia pedido e aceita amizade
    await service.sendFriendRequest(userA, userB);
    await service.acceptFriendRequest(userB, userA);

    // Agora canal de DM é criado com sucesso
    const dm = await service.getOrCreateDmChannel(userA, userB);
    expect(dm.id).toBeDefined();
    expect(dm.participantIds).toContain(userA);
    expect(dm.participantIds).toContain(userB);

    // Chamar novamente retorna o mesmo canal existente
    const dmSame = await service.getOrCreateDmChannel(userB, userA);
    expect(dmSame.id).toBe(dm.id);
  });

  it('rejeita envio de mensagens diretas se os usuários não forem amigos', async () => {
    await service.sendFriendRequest(userA, userB);
    await service.acceptFriendRequest(userB, userA);
    const dm = await service.getOrCreateDmChannel(userA, userB);

    // Desfaz a amizade
    await service.removeFriendship(userA, userB);

    // Tentativa de envio após fim da amizade -> BLOQUEADA
    await expect(
      service.sendDmMessage({
        dmChannelId: dm.id,
        authorId: userA,
        authorName: 'Alice',
        content: 'Oi Bob!'
      })
    ).rejects.toThrow(/AMIZADE_NECESSARIA_PARA_DM/i);
  });

  it('bloqueia imediatamente envio em DM se houver bloqueio entre as partes', async () => {
    await service.sendFriendRequest(userA, userB);
    await service.acceptFriendRequest(userB, userA);
    const dm = await service.getOrCreateDmChannel(userA, userB);

    // Bob bloqueia Alice
    await service.blockUser(userB, userA);

    // Alice tenta mandar DM para Bob -> BLOQUEADA
    await expect(
      service.sendDmMessage({
        dmChannelId: dm.id,
        authorId: userA,
        authorName: 'Alice',
        content: 'Você me bloqueou?'
      })
    ).rejects.toThrow(/BLOQUEIO_ATIVO/i);

    // Bob também não consegue mandar para Alice enquanto estiver bloqueado
    await expect(
      service.sendDmMessage({
        dmChannelId: dm.id,
        authorId: userB,
        authorName: 'Bob',
        content: 'Não fale comigo'
      })
    ).rejects.toThrow(/BLOQUEIO_ATIVO/i);
  });

  it('garante isolamento absoluto de DMs contra acesso por terceiros', async () => {
    await service.sendFriendRequest(userA, userB);
    await service.acceptFriendRequest(userB, userA);
    const dm = await service.getOrCreateDmChannel(userA, userB);

    await service.sendDmMessage({
      dmChannelId: dm.id,
      authorId: userA,
      authorName: 'Alice',
      content: 'Segredo entre nós'
    });

    // Terceiro (mesmo que admin do servidor) tenta ler as mensagens da DM -> ACESSO_NEGADO
    await expect(
      service.getDmMessages(dm.id, userSpy)
    ).rejects.toThrow(/ACESSO_NEGADO_DM/i);

    // Terceiro tenta consultar canal de DM alheio
    await expect(
      service.getDmChannel(dm.id, userSpy)
    ).rejects.toThrow(/ACESSO_NEGADO_DM/i);

    // Terceiro tenta enviar mensagem na DM alheia
    await expect(
      service.sendDmMessage({
        dmChannelId: dm.id,
        authorId: userSpy,
        authorName: 'Espião',
        content: 'Invadindo DM'
      })
    ).rejects.toThrow(/ACESSO_NEGADO_DM/i);
  });

  it('garante envio idempotente em DMs e respeito à janela de 10 dias', async () => {
    await service.sendFriendRequest(userA, userB);
    await service.acceptFriendRequest(userB, userA);
    const dm = await service.getOrCreateDmChannel(userA, userB);

    const nonce = 'dm-nonce-abc-123';
    const msg1 = await service.sendDmMessage({
      dmChannelId: dm.id,
      authorId: userA,
      authorName: 'Alice',
      content: 'Mensagem com nonce',
      nonce
    });

    // Reenvio com mesmo nonce
    const msg2 = await service.sendDmMessage({
      dmChannelId: dm.id,
      authorId: userA,
      authorName: 'Alice',
      content: 'Mensagem com nonce',
      nonce
    });

    expect(msg2.id).toBe(msg1.id);

    const messages = await service.getDmMessages(dm.id, userA);
    expect(messages.length).toBe(1);

    // Simula mensagem antiga na DM (11 dias atrás)
    const elevenDaysAgo = Date.now() - 11 * 24 * 60 * 60 * 1000;
    (service as any).dmMessages.push({
      id: 'dmsg-old',
      dmChannelId: dm.id,
      authorId: userB,
      authorName: 'Bob',
      content: 'Mensagem expirada de 11 dias',
      createdAt: elevenDaysAgo
    });

    const messagesAfterCutoff = await service.getDmMessages(dm.id, userA);
    expect(messagesAfterCutoff.map((m) => m.id)).not.toContain('dmsg-old');
  });
});
