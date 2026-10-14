import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InMemoryPresenceService, PRESENCE_TTL_MS } from '../../src/renderer/src/services/presence-service';

describe('InMemoryPresenceService - Presença Efêmera e Expiração', () => {
  let service: InMemoryPresenceService;
  const userId = 'user-alice';

  beforeEach(() => {
    service = new InMemoryPresenceService();
  });

  it('inicia usuário desconhecido com status offline', () => {
    expect(service.getPresence(userId)).toBe('offline');
  });

  it('permite definir presença manualmente e emite notificação', () => {
    const listener = vi.fn();
    service.onPresenceUpdate(listener);

    service.setPresence(userId, 'online');
    expect(service.getPresence(userId)).toBe('online');
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        userId,
        status: 'online'
      })
    );

    // Mudar para idle
    service.setPresence(userId, 'idle');
    expect(service.getPresence(userId)).toBe('idle');
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        userId,
        status: 'idle'
      })
    );
  });

  it('heartbeat mantém o usuário online', () => {
    service.setPresence(userId, 'online');
    service.heartbeat(userId);
    expect(service.getPresence(userId)).toBe('online');
  });

  it('expira automaticamente para offline quando o heartbeat excede o TTL de 30s', () => {
    service.setPresence(userId, 'online');
    expect(service.getPresence(userId)).toBe('online');

    // Simula passagem do tempo além do TTL (31 segundos atrás)
    const now = Date.now();
    (service as any).presences.set(userId, {
      userId,
      status: 'online',
      lastSeen: now - (PRESENCE_TTL_MS + 1000)
    });

    // Ao consultar a presença, detecta expiração efêmera e retorna offline
    expect(service.getPresence(userId)).toBe('offline');
  });

  it('não emite notificações repetidas se o status não tiver mudado', () => {
    const listener = vi.fn();
    service.setPresence(userId, 'online');

    service.onPresenceUpdate(listener);

    // Enviar heartbeat não altera o status 'online'
    service.heartbeat(userId);
    expect(listener).not.toHaveBeenCalled();

    // Redefinir para 'online' novamente não emite
    service.setPresence(userId, 'online');
    expect(listener).not.toHaveBeenCalled();

    // Mudar para offline emite
    service.setPresence(userId, 'offline');
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ status: 'offline' }));
  });
});
