import { describe, it, expect, beforeEach } from 'vitest';
import { MockAuthService } from '../../src/renderer/src/services/mock-auth';
import { MockChatService } from '../../src/renderer/src/services/mock-chat';
import { MockMediaService } from '../../src/renderer/src/services/mock-media';
import { PermissionFlags } from '../../src/common/permissions';

describe('Local Mock Services Layer', () => {
  describe('MockAuthService', () => {
    it('manages mock login and session state in memory', async () => {
      const auth = new MockAuthService();
      expect(auth.getCurrentUser()).toBeNull();

      const user = await auth.login('amigo-1');
      expect(user).not.toBeNull();
      expect(user?.username).toBe('amigo-1');
      expect(auth.getCurrentUser()?.id).toBe(user?.id);

      await auth.logout();
      expect(auth.getCurrentUser()).toBeNull();
    });

    it('suporta login com e-mail e senha cadastrando novo usuário', async () => {
      const auth = new MockAuthService();
      const user = await auth.loginWithCredentials('novo.amigo@email.com', 'senha1234', true, 'Novo Amigo');
      expect(user).toBeDefined();
      expect(user.displayName).toBe('Novo Amigo');
      expect(user.username).toBe('novo_amigo');
      expect(auth.getCurrentUser()?.id).toBe(user.id);

      // Impede cadastro duplicado do mesmo e-mail
      await expect(
        auth.loginWithCredentials('novo.amigo@email.com', 'outrasenha', true)
      ).rejects.toThrow(/já está cadastrado/i);

      // Rejeita senha incorreta
      await expect(
        auth.loginWithCredentials('novo.amigo@email.com', 'senhaerrada', false)
      ).rejects.toThrow(/Senha incorreta/i);

      // Sucesso ao logar com senha correta
      const logged = await auth.loginWithCredentials('novo.amigo@email.com', 'senha1234', false);
      expect(logged.id).toBe(user.id);
    });

    it('suporta login com Google atribuindo perfil Google', async () => {
      const auth = new MockAuthService();
      const user = await auth.loginWithGoogle();
      expect(user).toBeDefined();
      expect(user.displayName).toBe('Usuário Google');
      expect(user.id).toContain('user-google');
      expect(auth.getCurrentUser()?.id).toBe(user.id);
    });
  });

  describe('MockChatService with 10-day Retention', () => {
    let chat: MockChatService;
    const channelId = 'channel-general';

    beforeEach(() => {
      chat = new MockChatService();
    });

    it('sends and lists messages within the 10-day retention window', async () => {
      const msg = await chat.sendMessage({
        channelId,
        authorId: 'user-1',
        authorName: 'Amigo Um',
        content: 'Olá pessoal!'
      });

      expect(msg.id).toBeDefined();
      expect(msg.content).toBe('Olá pessoal!');

      const messages = await chat.getMessages(channelId);
      expect(messages).toHaveLength(1);
      expect(messages[0].id).toBe(msg.id);
    });

    it('strictly hides messages created more than 10 days ago (Review Focus requirement)', async () => {
      const now = Date.now();
      const nineDaysAgo = now - 9 * 24 * 60 * 60 * 1000;
      const elevenDaysAgo = now - 11 * 24 * 60 * 60 * 1000;

      // Injeta mensagem válida de 9 dias atrás
      await chat.injectMessageForTesting({
        id: 'msg-recent',
        channelId,
        authorId: 'user-1',
        authorName: 'Amigo Um',
        content: 'Mensagem ainda visível',
        createdAt: nineDaysAgo
      });

      // Injeta mensagem expirada de 11 dias atrás
      await chat.injectMessageForTesting({
        id: 'msg-expired',
        channelId,
        authorId: 'user-2',
        authorName: 'Amigo Dois',
        content: 'Mensagem antiga expirada',
        createdAt: elevenDaysAgo
      });

      const messages = await chat.getMessages(channelId);

      // Apenas a mensagem de 9 dias atrás deve ser retornada
      expect(messages.map((m) => m.id)).toContain('msg-recent');
      expect(messages.map((m) => m.id)).not.toContain('msg-expired');
    });

    it('allows author or manager to delete message, but forbids unauthorized users', async () => {
      const msg = await chat.sendMessage({
        channelId,
        authorId: 'user-author',
        authorName: 'Autor',
        content: 'Para deletar'
      });

      // Autor pode deletar
      const deletedByAuthor = await chat.deleteMessage({
        messageId: msg.id,
        requesterId: 'user-author',
        permissions: 0n
      });
      expect(deletedByAuthor).toBe(true);

      // Re-envia
      const msg2 = await chat.sendMessage({
        channelId,
        authorId: 'user-author',
        authorName: 'Autor',
        content: 'Nova mensagem'
      });

      // Usuário sem permissão não pode deletar
      const rejectedDelete = await chat.deleteMessage({
        messageId: msg2.id,
        requesterId: 'user-stranger',
        permissions: 0n
      });
      expect(rejectedDelete).toBe(false);

      // Moderador com MANAGE_MESSAGES pode deletar
      const deletedByMod = await chat.deleteMessage({
        messageId: msg2.id,
        requesterId: 'user-mod',
        permissions: PermissionFlags.MANAGE_MESSAGES
      });
      expect(deletedByMod).toBe(true);
    });
  });

  describe('MockMediaService', () => {
    let media: MockMediaService;

    beforeEach(() => {
      media = new MockMediaService();
    });

    it('enforces maximum 10 participants per voice call', async () => {
      for (let i = 1; i <= 10; i++) {
        const success = await media.joinCall(`user-${i}`, `Participante ${i}`);
        expect(success).toBe(true);
      }

      // Décimo primeiro participante deve ser rejeitado
      const eleventh = await media.joinCall('user-11', 'Excedente');
      expect(eleventh).toBe(false);
      expect(media.getParticipants()).toHaveLength(10);
    });

    it('enforces maximum 1 screen share stream per call', async () => {
      await media.joinCall('user-1', 'Streamer 1');
      await media.joinCall('user-2', 'Streamer 2');

      const startFirst = await media.startScreenShare('user-1');
      expect(startFirst).toBe(true);

      // Segunda tentativa simultânea deve ser recusada (D-02: apenas 1 tela por chamada)
      const startSecond = await media.startScreenShare('user-2');
      expect(startSecond).toBe(false);

      // Após parar a primeira, a segunda deve ser permitida
      await media.stopScreenShare('user-1');
      const startSecondAfter = await media.startScreenShare('user-2');
      expect(startSecondAfter).toBe(true);
    });
  });
});
