import { describe, expect, it } from 'vitest';
import type { FriendshipService } from '../../src/common/text-types';
import { InMemoryFriendshipService } from '../../src/renderer/src/services/friendship-service';

async function createConversation() {
  const service = new InMemoryFriendshipService();
  await service.sendFriendRequest('alice', 'bob');
  await service.acceptFriendRequest('bob', 'alice');
  const dm = await service.getOrCreateDmChannel('alice', 'bob');
  await service.sendDmMessage({
    dmChannelId: dm.id, authorId: 'alice', authorName: 'Alice', content: 'Mensagem privada'
  });
  return { service, dm };
}

describe('DM: autorização contínua e invalidação privada', () => {
  it.each(['remove', 'block'] as const)('revoga leituras e listagem dos dois participantes após %s', async (action) => {
    const { service, dm } = await createConversation();
    if (action === 'remove') await service.removeFriendship('alice', 'bob');
    else await service.blockUser('bob', 'alice');

    for (const user of ['alice', 'bob']) {
      await expect(service.getDmChannel(dm.id, user)).rejects.toThrow();
      await expect(service.getDmMessages(dm.id, user)).rejects.toThrow();
      expect(await service.getUserDms(user)).toEqual([]);
    }
  });

  it('nega leituras e assinatura a terceiros mesmo que sejam amigos de um participante', async () => {
    const { service, dm } = await createConversation();
    await service.sendFriendRequest('alice', 'spy');
    await service.acceptFriendRequest('spy', 'alice');
    await expect(service.getDmChannel(dm.id, 'spy')).rejects.toThrow(/ACESSO_NEGADO_DM/);
    await expect(service.getDmMessages(dm.id, 'spy')).rejects.toThrow(/ACESSO_NEGADO_DM/);
    expect(() => (service as FriendshipService).onDmUpdated!(dm.id, 'spy', () => {})).toThrow(/ACESSO_NEGADO_DM/);
    expect(await service.getUserDms('spy')).toEqual([]);
  });

  it.each(['remove', 'block'] as const)('recusa novas assinaturas e invalida as antigas sem conteúdo após %s', async (action) => {
    const { service, dm } = await createConversation();
    const callbacks: unknown[][] = [];
    const revokedReads: Promise<unknown>[] = [];
    const blockedState: Promise<boolean>[] = [];
    service.onDmUpdated!(dm.id, 'alice', (...args) => {
      callbacks.push(args);
      revokedReads.push(service.getDmMessages(dm.id, 'alice').then(() => 'leaked', () => 'denied'));
      blockedState.push(service.isBlocked('alice', 'bob'));
    });

    if (action === 'remove') await service.removeFriendship('alice', 'bob');
    else await service.blockUser('bob', 'alice');

    expect(callbacks).toEqual([[]]);
    expect(await Promise.all(revokedReads)).toEqual(['denied']);
    expect(await Promise.all(blockedState)).toEqual([action === 'block']);
    expect(() => service.onDmUpdated!(dm.id, 'alice', () => {})).toThrow(action === 'block' ? /BLOQUEIO_ATIVO/ : /AMIZADE_NECESSARIA_PARA_DM/);
    await service.unblockUser('bob', 'alice');
    await service.sendFriendRequest('alice', 'bob');
    await service.acceptFriendRequest('bob', 'alice');
    await service.sendDmMessage({dmChannelId: dm.id, authorId: 'bob', authorName: 'Bob', content: 'Nova amizade'});
    expect(callbacks).toEqual([[]]);
  });

  it('notifica os dois participantes sem payload, após persistir, e unsubscribe encerra a assinatura', async () => {
    const { service, dm } = await createConversation();
    const aliceEvents: unknown[][] = [];
    const bobEvents: unknown[][] = [];
    const readbacks: Promise<string[]>[] = [];
    const unsubscribe = service.onDmUpdated!(dm.id, 'alice', (...args) => {
      aliceEvents.push(args);
      readbacks.push(service.getDmMessages(dm.id, 'alice').then(messages => messages.map(message => message.content)));
    });
    service.onDmUpdated!(dm.id, 'bob', (...args) => bobEvents.push(args));
    const params = {dmChannelId: dm.id, authorId: 'bob', authorName: 'Bob', content: 'Resposta', nonce: 'reply-1'};
    await service.sendDmMessage(params);
    await service.sendDmMessage(params);
    expect(aliceEvents).toEqual([[]]);
    expect(bobEvents).toEqual([[]]);
    expect(await Promise.all(readbacks)).toEqual([['Mensagem privada', 'Resposta']]);

    unsubscribe();
    unsubscribe();
    await service.sendDmMessage({...params, content: 'Outra resposta', nonce: 'reply-2'});
    expect(aliceEvents).toEqual([[]]);
    expect(bobEvents).toEqual([[], []]);
  });

  it('falha em listener não interrompe envio nem notificações de outro participante', async () => {
    const { service, dm } = await createConversation();
    let updates = 0;
    service.onDmUpdated!(dm.id, 'alice', () => { throw new Error('Falha na UI'); });
    service.onDmUpdated!(dm.id, 'bob', () => { updates++; });
    await expect(service.sendDmMessage({dmChannelId: dm.id, authorId: 'bob', authorName: 'Bob', content: 'Persistida'})).resolves.toMatchObject({content: 'Persistida'});
    expect(updates).toBe(1);
    expect((await service.getDmMessages(dm.id, 'bob')).map(message => message.content)).toEqual(['Mensagem privada', 'Persistida']);
    await expect(service.blockUser('bob', 'alice')).resolves.toMatchObject({blockerId: 'bob'});
    expect(updates).toBe(2);
  });

  it('bloqueio iniciado antes do envio impede a gravação sem janela entre checks assíncronos', async () => {
    const { service, dm } = await createConversation();
    const blocked = service.blockUser('bob', 'alice');
    const sent = service.sendDmMessage({dmChannelId: dm.id, authorId: 'alice', authorName: 'Alice', content: 'Não gravar'});
    await blocked;
    await expect(sent).rejects.toThrow(/BLOQUEIO_ATIVO/);
    await service.unblockUser('bob', 'alice');
    await service.sendFriendRequest('alice', 'bob');
    await service.acceptFriendRequest('bob', 'alice');
    expect((await service.getDmMessages(dm.id, 'alice')).map(message => message.content)).toEqual(['Mensagem privada']);
  });

  it('retornos de canais não permitem trocar participantes para expor o histórico a outro amigo', async () => {
    const { service, dm } = await createConversation();
    await service.sendFriendRequest('alice', 'spy');
    await service.acceptFriendRequest('spy', 'alice');
    const fetched = (await service.getDmChannel(dm.id, 'alice'))!;
    const listed = (await service.getUserDms('alice'))[0];
    const reopened = await service.getOrCreateDmChannel('bob', 'alice');
    for (const channel of [dm, fetched, listed, reopened]) channel.participantIds[1] = 'spy';
    await expect(service.getDmMessages(dm.id, 'spy')).rejects.toThrow(/ACESSO_NEGADO_DM/);
    expect((await service.getDmChannel(dm.id, 'alice'))!.participantIds).toEqual(['alice', 'bob']);
  });

  it('assinatura de canal ausente falha e consulta de canal ausente mantém null', async () => {
    const service = new InMemoryFriendshipService();
    expect(() => service.onDmUpdated!('missing', 'alice', () => {})).toThrow(/DM_NAO_ENCONTRADA/);
    expect(await service.getDmChannel('missing', 'alice')).toBeNull();
  });
});
