import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InMemorySessionStorage, SessionManager } from '../../src/renderer/src/services/session-manager';
import { DesktopAuthService } from '../../src/renderer/src/services/auth-service';
import type { AuthSession, User } from '../../src/common/auth-types';

describe('SessionManager', () => {
  let storage: InMemorySessionStorage;
  let sessionManager: SessionManager;

  const mockUser: User = {
    id: 'user-123',
    username: 'tester',
    displayName: 'Testador'
  };

  const validSession: AuthSession = {
    user: mockUser,
    token: 'jwt-valid-token-123',
    expiresAt: Date.now() + 1000 * 60 * 60 // 1 hour ahead
  };

  beforeEach(() => {
    storage = new InMemorySessionStorage();
    sessionManager = new SessionManager(storage);
  });

  it('salva e recupera uma sessão válida com sucesso', async () => {
    await sessionManager.saveSession(validSession);
    const restored = await sessionManager.loadSession();
    expect(restored).not.toBeNull();
    expect(restored?.user.id).toBe('user-123');
    expect(restored?.token).toBe('jwt-valid-token-123');
  });

  it('descarta e limpa automaticamente sessão expirada', async () => {
    const expiredSession: AuthSession = {
      ...validSession,
      expiresAt: Date.now() - 5000 // 5 seconds in past
    };
    await sessionManager.saveSession(expiredSession);
    const restored = await sessionManager.loadSession();
    expect(restored).toBeNull();
    // Verifica que o storage foi limpo
    const directCheck = await storage.load();
    expect(directCheck).toBeNull();
  });

  it('limpa a sessão no logout', async () => {
    await sessionManager.saveSession(validSession);
    await sessionManager.clearSession();
    const restored = await sessionManager.loadSession();
    expect(restored).toBeNull();
  });
});

describe('DesktopAuthService', () => {
  let storage: InMemorySessionStorage;
  let sessionManager: SessionManager;
  let authService: DesktopAuthService;

  beforeEach(() => {
    storage = new InMemorySessionStorage();
    sessionManager = new SessionManager(storage);
    authService = new DesktopAuthService(sessionManager, {
      clientId: 'test-google-client-id',
      redirectUri: 'discord-desktop://auth/callback'
    });
  });

  it('gera URL de autenticação com state anti-CSRF aleatório', () => {
    const { authUrl, state } = authService.initiateLogin('google');
    expect(state).toBeDefined();
    expect(state.length).toBeGreaterThan(16);
    expect(authUrl).toContain('accounts.google.com/o/oauth2/v2/auth');
    expect(authUrl).toContain(`state=${state}`);
    expect(authUrl).toContain('client_id=test-google-client-id');
  });

  it('rejeita callback com state divergente ou inválido (Anti-CSRF)', async () => {
    authService.initiateLogin('google');
    await expect(
      authService.handleCallback({ code: 'auth-code-123', state: 'wrong-tampered-state' })
    ).rejects.toThrow(/Anti-CSRF/i);
  });

  it('processa callback válido, persiste sessão e emite evento', async () => {
    const listener = vi.fn();
    authService.onAuthStateChanged(listener);

    const { state } = authService.initiateLogin('google');
    const user = await authService.handleCallback({ code: 'auth-code-valid', state });

    expect(user).toBeDefined();
    expect(user.displayName).toBeDefined();
    expect(authService.getCurrentUser()?.id).toBe(user.id);
    expect(listener).toHaveBeenCalledWith(user);

    // Confirma que sessão foi persistida
    const stored = await sessionManager.loadSession();
    expect(stored?.user.id).toBe(user.id);
  });

  it('restaura sessão existente na inicialização', async () => {
    const user: User = { id: 'u-init', username: 'init-user', displayName: 'Usuário Inicial' };
    await sessionManager.saveSession({
      user,
      token: 'persisted-token',
      expiresAt: Date.now() + 10_000
    });

    const restored = await authService.restoreSession();
    expect(restored?.id).toBe('u-init');
    expect(authService.getCurrentUser()?.id).toBe('u-init');
  });

  it('suporta login local mock para desenvolvimento offline R$0', async () => {
    const user = await authService.login({ provider: 'mock', mockUsername: 'amigo-1' });
    expect(user.username).toBe('amigo-1');
    expect(authService.getCurrentUser()?.username).toBe('amigo-1');

    const stored = await sessionManager.loadSession();
    expect(stored?.user.username).toBe('amigo-1');
  });

  it('efetua logout invalidando a sessão e emitindo evento null', async () => {
    await authService.login({ provider: 'mock', mockUsername: 'amigo-1' });
    expect(authService.getCurrentUser()).not.toBeNull();

    const listener = vi.fn();
    authService.onAuthStateChanged(listener);

    await authService.logout();
    expect(authService.getCurrentUser()).toBeNull();
    expect(listener).toHaveBeenCalledWith(null);

    const stored = await sessionManager.loadSession();
    expect(stored).toBeNull();
  });
});
