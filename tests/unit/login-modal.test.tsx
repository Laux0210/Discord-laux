// @vitest-environment happy-dom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginModal } from '../../src/renderer/src/components/LoginModal';

describe('LoginModal Component', () => {
  let host: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    host.remove();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  async function setInputValue(input: HTMLInputElement, value: string) {
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }

  async function renderModal(props?: Partial<React.ComponentProps<typeof LoginModal>>) {
    const defaultProps = {
      onLoginGoogle: vi.fn(),
      onLoginCredentials: vi.fn(),
      onLoginMock: vi.fn(),
      errorMessage: null,
      ...props
    };

    await act(async () => {
      root.render(<LoginModal {...defaultProps} />);
    });

    return defaultProps;
  }

  it('renderiza os elementos principais de login: email, senha, botão Google e contas locais', async () => {
    await renderModal();

    expect(host.querySelector('[data-testid="login-modal"]')).not.toBeNull();
    expect(host.textContent).toContain('Boas-vindas de volta!');
    expect(host.querySelector('[data-testid="input-email"]')).not.toBeNull();
    expect(host.querySelector('[data-testid="input-password"]')).not.toBeNull();
    expect(host.querySelector('[data-testid="btn-login-credentials"]')).not.toBeNull();
    expect(host.querySelector('[data-testid="btn-login-google"]')).not.toBeNull();
    expect(host.textContent).toContain('Entrar com Google');

    // Botões locais de desenvolvimento R$0
    expect(host.querySelector('[data-testid="btn-login-amigo-1"]')).not.toBeNull();
    expect(host.querySelector('[data-testid="btn-login-amigo-2"]')).not.toBeNull();
    expect(host.querySelector('[data-testid="btn-login-amigo-3"]')).not.toBeNull();
    expect(host.textContent).toContain('Entrar como Amigo Um (Dono)');
  });

  it('exibe mensagem de erro passada via prop', async () => {
    await renderModal({ errorMessage: 'Falha de conexão com servidor' });

    const errorEl = host.querySelector('[data-testid="login-error"]');
    expect(errorEl).not.toBeNull();
    expect(errorEl?.textContent).toBe('Falha de conexão com servidor');
  });

  it('valida formato de e-mail ao submeter sem e-mail válido', async () => {
    const { onLoginCredentials } = await renderModal();

    const form = host.querySelector('[data-testid="form-login-credentials"]') as HTMLFormElement;
    const emailInput = host.querySelector('[data-testid="input-email"]') as HTMLInputElement;
    const passwordInput = host.querySelector('[data-testid="input-password"]') as HTMLInputElement;

    await setInputValue(emailInput, 'invalido');
    await setInputValue(passwordInput, '123456');

    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    expect(onLoginCredentials).not.toHaveBeenCalled();
    const errorEl = host.querySelector('[data-testid="login-error"]');
    expect(errorEl?.textContent).toContain('endereço de e-mail válido');
  });

  it('valida tamanho mínimo da senha ao submeter senha curta', async () => {
    const { onLoginCredentials } = await renderModal();

    const form = host.querySelector('[data-testid="form-login-credentials"]') as HTMLFormElement;
    const emailInput = host.querySelector('[data-testid="input-email"]') as HTMLInputElement;
    const passwordInput = host.querySelector('[data-testid="input-password"]') as HTMLInputElement;

    await setInputValue(emailInput, 'usuario@exemplo.com');
    await setInputValue(passwordInput, '123');

    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    expect(onLoginCredentials).not.toHaveBeenCalled();
    const errorEl = host.querySelector('[data-testid="login-error"]');
    expect(errorEl?.textContent).toContain('no mínimo 6 caracteres');
  });

  it('submete credenciais válidas chamando onLoginCredentials', async () => {
    const { onLoginCredentials } = await renderModal();

    const form = host.querySelector('[data-testid="form-login-credentials"]') as HTMLFormElement;
    const emailInput = host.querySelector('[data-testid="input-email"]') as HTMLInputElement;
    const passwordInput = host.querySelector('[data-testid="input-password"]') as HTMLInputElement;

    await setInputValue(emailInput, 'teste@discord.local');
    await setInputValue(passwordInput, 'senha-secreta-123');

    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    expect(onLoginCredentials).toHaveBeenCalledWith(
      'teste@discord.local',
      'senha-secreta-123',
      false,
      ''
    );
  });

  it('alterna para modo de cadastro e inclui nome de exibição', async () => {
    const { onLoginCredentials } = await renderModal();

    const toggleBtn = host.querySelector('[data-testid="btn-toggle-auth-mode"]') as HTMLButtonElement;
    expect(toggleBtn.textContent).toContain('Registre-se');

    await act(async () => {
      toggleBtn.click();
    });

    expect(host.textContent).toContain('Criar uma conta');
    const nameInput = host.querySelector('[data-testid="input-display-name"]') as HTMLInputElement;
    expect(nameInput).not.toBeNull();

    const emailInput = host.querySelector('[data-testid="input-email"]') as HTMLInputElement;
    const passwordInput = host.querySelector('[data-testid="input-password"]') as HTMLInputElement;
    const form = host.querySelector('[data-testid="form-login-credentials"]') as HTMLFormElement;

    await setInputValue(nameInput, 'Novo Membro');
    await setInputValue(emailInput, 'novo@discord.local');
    await setInputValue(passwordInput, 'senha-forte-456');

    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    expect(onLoginCredentials).toHaveBeenCalledWith(
      'novo@discord.local',
      'senha-forte-456',
      true,
      'Novo Membro'
    );
  });

  it('aciona login com Google ao clicar no botão oficial', async () => {
    const { onLoginGoogle } = await renderModal();

    const googleBtn = host.querySelector('[data-testid="btn-login-google"]') as HTMLButtonElement;
    await act(async () => {
      googleBtn.click();
    });

    expect(onLoginGoogle).toHaveBeenCalled();
  });

  it('aciona login mock ao clicar nas contas de desenvolvimento', async () => {
    const { onLoginMock } = await renderModal();

    const btn1 = host.querySelector('[data-testid="btn-login-amigo-1"]') as HTMLButtonElement;
    const btn2 = host.querySelector('[data-testid="btn-login-amigo-2"]') as HTMLButtonElement;
    const btn3 = host.querySelector('[data-testid="btn-login-amigo-3"]') as HTMLButtonElement;

    await act(async () => {
      btn1.click();
    });
    expect(onLoginMock).toHaveBeenCalledWith('amigo-1');

    await act(async () => {
      btn2.click();
    });
    expect(onLoginMock).toHaveBeenCalledWith('amigo-2');

    await act(async () => {
      btn3.click();
    });
    expect(onLoginMock).toHaveBeenCalledWith('amigo-3');
  });
});
