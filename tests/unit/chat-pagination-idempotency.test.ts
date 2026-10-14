import { describe, it, expect, beforeEach } from 'vitest';
import { DesktopChatService } from '../../src/renderer/src/services/desktop-chat-service';
import { PermissionFlags } from '../../src/common/permissions';

describe('DesktopChatService - Idempotência, Paginação e Limites', () => {
  let chatService: DesktopChatService;
  const channelId = 'chan-test-1';
  const authorId = 'user-alice';
  const otherUserId = 'user-bob';

  beforeEach(() => {
    chatService = new DesktopChatService();
  });

  it('rejeita mensagens vazias ou que excedem 2000 caracteres', async () => {
    await expect(
      chatService.sendMessage({
        channelId,
        authorId,
        authorName: 'Alice',
        content: '   '
      })
    ).rejects.toThrow(/CONTEUDO_VAZIO/i);

    const longContent = 'a'.repeat(2001);
    await expect(
      chatService.sendMessage({
        channelId,
        authorId,
        authorName: 'Alice',
        content: longContent
      })
    ).rejects.toThrow(/CONTEUDO_EXCEDE_LIMITE/i);
  });

  it('garante idempotência por nonce evitando mensagens duplicadas', async () => {
    const clientNonce = 'nonce-uuid-12345';

    // Primeiro envio
    const msg1 = await chatService.sendMessage({
      channelId,
      authorId,
      authorName: 'Alice',
      content: 'Olá mundo!',
      nonce: clientNonce
    });

    expect(msg1.id).toBeDefined();
    expect(msg1.content).toBe('Olá mundo!');

    // Reenvio acidental (reconexão ou duplo clique) com mesmo nonce e autor
    const msg2 = await chatService.sendMessage({
      channelId,
      authorId,
      authorName: 'Alice',
      content: 'Olá mundo!',
      nonce: clientNonce
    });

    expect(msg2.id).toBe(msg1.id);
    expect(msg2.createdAt).toBe(msg1.createdAt);

    // Confirma que só existe 1 mensagem na listagem
    const messages = await chatService.getMessages(channelId);
    expect(messages.length).toBe(1);
  });

  it('suporta paginação cronológica por cursor "before" e limite', async () => {
    // Insere 15 mensagens sequenciais
    const baseTime = Date.now() - 1000 * 60;
    for (let i = 1; i <= 15; i++) {
      await chatService.injectMessageForTesting({
        id: `msg-${i}`,
        channelId,
        authorId,
        authorName: 'Alice',
        content: `Mensagem ${i}`,
        createdAt: baseTime + i * 1000
      });
    }

    // Busca página padrão de 10 itens
    const page1 = await chatService.getMessages(channelId, { limit: 10 });
    expect(page1.length).toBe(10);
    // Deve retornar as 10 mais recentes ordenadas cronologicamente
    expect(page1[page1.length - 1].content).toBe('Mensagem 15');
    expect(page1[0].content).toBe('Mensagem 6');

    // Busca página anterior usando o timestamp da primeira mensagem da página 1 como cursor
    const oldestInPage1 = page1[0].createdAt;
    const page2 = await chatService.getMessages(channelId, { limit: 10, before: oldestInPage1 });
    expect(page2.length).toBe(5);
    expect(page2[page2.length - 1].content).toBe('Mensagem 5');
    expect(page2[0].content).toBe('Mensagem 1');
  });

  it('oculta mensagens que ultrapassaram a janela de retenção de 10 dias', async () => {
    const now = Date.now();
    const tenDaysAndOneMinute = 10 * 24 * 60 * 60 * 1000 + 60_000;
    const nineDays = 9 * 24 * 60 * 60 * 1000;

    // Mensagem expirada (10 dias e 1 minuto atrás)
    await chatService.injectMessageForTesting({
      id: 'msg-expired',
      channelId,
      authorId,
      authorName: 'Alice',
      content: 'Mensagem antiga expirada',
      createdAt: now - tenDaysAndOneMinute
    });

    // Mensagem válida (9 dias atrás)
    await chatService.injectMessageForTesting({
      id: 'msg-valid',
      channelId,
      authorId,
      authorName: 'Alice',
      content: 'Mensagem ainda válida',
      createdAt: now - nineDays
    });

    const messages = await chatService.getMessages(channelId);
    expect(messages.map((m) => m.id)).not.toContain('msg-expired');
    expect(messages.map((m) => m.id)).toContain('msg-valid');
  });

  it('permite exclusão pelo autor ou por quem tem MANAGE_MESSAGES', async () => {
    const msg = await chatService.sendMessage({
      channelId,
      authorId,
      authorName: 'Alice',
      content: 'Para ser deletada'
    });

    // Outro usuário sem permissão tenta deletar -> recusado
    const unauthorized = await chatService.deleteMessage({
      messageId: msg.id,
      requesterId: otherUserId,
      permissions: 0n
    });
    expect(unauthorized).toBe(false);

    // Usuário com MANAGE_MESSAGES deleta com sucesso
    const deletedByMod = await chatService.deleteMessage({
      messageId: msg.id,
      requesterId: otherUserId,
      permissions: PermissionFlags.MANAGE_MESSAGES
    });
    expect(deletedByMod).toBe(true);

    const messagesAfter = await chatService.getMessages(channelId);
    expect(messagesAfter.find((m) => m.id === msg.id)).toBeUndefined();
  });
});
