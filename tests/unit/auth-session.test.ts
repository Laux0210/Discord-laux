import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InMemorySessionStorage, SessionManager } from '../../src/renderer/src/services/session-manager';
import { DesktopAuthService } from '../../src/renderer/src/services/auth-service';
import type { AuthSession } from '../../src/common/auth-types';
import type { User } from '../../src/common/types';

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

  it('suporta login com e-mail e senha persistindo sessão de 7 dias', async () => {
    const user = await authService.login({
      provider: 'credentials',
      email: 'alex@discord.local',
      password: 'senha-segura-123',
      displayName: 'Alexandre'
    });

    expect(user.username).toBe('alex');
    expect(user.displayName).toBe('Alexandre');
    expect(authService.getCurrentUser()?.id).toBe(user.id);

    const stored = await sessionManager.loadSession();
    expect(stored).not.toBeNull();
    expect(stored?.user.username).toBe('alex');
    // Sessão de 7 dias
    expect(stored!.expiresAt).toBeGreaterThan(Date.now() + 1000 * 60 * 60 * 24 * 6);
  });

  it('valida formato de e-mail e tamanho de senha no login por credenciais', async () => {
    await expect(
      authService.login({
        provider: 'credentials',
        email: 'invalido-sem-arroba',
        password: 'senha'
      })
    ).rejects.toThrow(/endereço de e-mail válido/i);

    await expect(
      authService.login({
        provider: 'credentials',
        email: 'valido@email.com',
        password: '123'
      })
    ).rejects.toThrow(/no mínimo 6 caracteres/i);
  });

  it('suporta login com Google simulado diretamente', async () => {
    const user = await authService.login({
      provider: 'google',
      displayName: 'Usuário Google Teste'
    });

    expect(user.displayName).toBe('Usuário Google Teste');
    expect(user.id).toContain('user-google');
    expect(authService.getCurrentUser()?.displayName).toBe('Usuário Google Teste');

    const stored = await sessionManager.loadSession();
    expect(stored?.user.displayName).toBe('Usuário Google Teste');
  });

  it('suporta chamadas via métodos auxiliares loginWithCredentials e loginWithGoogle', async () => {
    const credUser = await authService.loginWithCredentials('marcos@teste.com', '12345678', false, 'Marcos');
    expect(credUser.username).toBe('marcos');

    const googleUser = await authService.loginWithGoogle();
    expect(googleUser.displayName).toBe('Usuário Google Autenticado');
  });
});

