import React, { useState } from 'react';

export interface LoginModalProps {
  onLoginGoogle: () => void | Promise<void>;
  onLoginCredentials?: (
    email: string,
    password: string,
    isSignUp?: boolean,
    displayName?: string
  ) => void | Promise<void>;
  onLoginMock: (username: string) => void | Promise<void>;
  errorMessage?: string | null;
  allowGoogle?: boolean;
  allowMock?: boolean;
  minPasswordLength?: number;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  onLoginGoogle,
  onLoginCredentials,
  onLoginMock,
  errorMessage,
  allowGoogle = true,
  allowMock = true,
  minPasswordLength = 6
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes('@') || trimmedEmail.length < 5) {
      setFormError('Por favor, informe um endereço de e-mail válido.');
      return;
    }

    if (!password || password.length < minPasswordLength) {
      setFormError(`A senha deve conter no mínimo ${minPasswordLength} caracteres.`);
      return;
    }

    setIsSubmitting(true);
    try {
      if (onLoginCredentials) {
        await onLoginCredentials(trimmedEmail, password, isSignUp, displayName.trim());
      } else {
        // Fallback para mock caso onLoginCredentials não tenha sido fornecido
        await onLoginMock(trimmedEmail);
      }
    } catch (err: any) {
      setFormError(err?.message || 'Falha ao autenticar.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeError = formError || errorMessage;

  return (
    <div
      data-testid="login-modal"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        width: '100vw',
        backgroundColor: '#1e1f22',
        color: '#f2f3f5',
        overflowY: 'auto',
        padding: '24px',
        boxSizing: 'border-box'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          padding: '32px',
          backgroundColor: '#313338',
          borderRadius: '8px',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          gap: '16px'
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: 'bold' }}>
            {isSignUp ? 'Criar uma conta' : 'Boas-vindas de volta!'}
          </h2>
          <p style={{ margin: 0, fontSize: '14px', color: '#949ba4' }}>
            {isSignUp
              ? 'Estamos muito animados em ter você com a gente!'
              : 'Estamos muito animados em ver você novamente.'}
          </p>
        </div>

        {activeError && (
          <div
            data-testid="login-error"
            style={{
              width: '100%',
              padding: '10px 12px',
              backgroundColor: '#f23f43',
              color: '#ffffff',
              borderRadius: '4px',
              fontSize: '13px',
              textAlign: 'center',
              boxSizing: 'border-box'
            }}
          >
            {activeError}
          </div>
        )}

        {/* Formulário de Login / Cadastro com E-mail e Senha */}
        <form
          data-testid="form-login-credentials"
          onSubmit={handleSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
        >
          {isSignUp && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label
                htmlFor="login-display-name"
                style={{
                  fontSize: '12px',
                  fontWeight: 'bold',
                  color: '#b5bac1',
                  textTransform: 'uppercase'
                }}
              >
                Nome de exibição
              </label>
              <input
                id="login-display-name"
                data-testid="input-display-name"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Como seus amigos devem te chamar?"
                disabled={isSubmitting}
                style={{
                  width: '100%',
                  height: '40px',
                  padding: '0 10px',
                  backgroundColor: '#1e1f22',
                  border: '1px solid #232428',
                  borderRadius: '4px',
                  color: '#dbdee1',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label
              htmlFor="login-email"
              style={{
                fontSize: '12px',
                fontWeight: 'bold',
                color: '#b5bac1',
                textTransform: 'uppercase'
              }}
            >
              E-mail <span style={{ color: '#f23f43' }}>*</span>
            </label>
            <input
              id="login-email"
              data-testid="input-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seuemail@exemplo.com"
              required
              disabled={isSubmitting}
              style={{
                width: '100%',
                height: '40px',
                padding: '0 10px',
                backgroundColor: '#1e1f22',
                border: '1px solid #232428',
                borderRadius: '4px',
                color: '#dbdee1',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label
              htmlFor="login-password"
              style={{
                fontSize: '12px',
                fontWeight: 'bold',
                color: '#b5bac1',
                textTransform: 'uppercase'
              }}
            >
              Senha <span style={{ color: '#f23f43' }}>*</span>
            </label>
            <input
              id="login-password"
              data-testid="input-password"
              type="password"
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              minLength={minPasswordLength}
              maxLength={128}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Sua senha secreta"
              required
              disabled={isSubmitting}
              style={{
                width: '100%',
                height: '40px',
                padding: '0 10px',
                backgroundColor: '#1e1f22',
                border: '1px solid #232428',
                borderRadius: '4px',
                color: '#dbdee1',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <button
            type="submit"
            data-testid="btn-login-credentials"
            disabled={isSubmitting}
            style={{
              width: '100%',
              height: '44px',
              backgroundColor: '#5865f2',
              color: '#ffffff',
              border: 'none',
              borderRadius: '4px',
              fontSize: '15px',
              fontWeight: 'bold',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              marginTop: '4px',
              opacity: isSubmitting ? 0.7 : 1,
              transition: 'background-color 0.17s ease'
            }}
          >
            {isSubmitting ? 'Aguarde...' : isSignUp ? 'Cadastrar-se' : 'Entrar'}
          </button>

          <div style={{ marginTop: '2px', fontSize: '13px', color: '#949ba4' }}>
            <button
              type="button"
              data-testid="btn-toggle-auth-mode"
              onClick={() => {
                setIsSignUp((prev) => !prev);
                setFormError(null);
              }}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                color: '#00a8fc',
                fontSize: '13px',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              {isSignUp ? 'Já tem uma conta? Entrar' : 'Precisa de uma conta? Registre-se'}
            </button>
          </div>
        </form>

        {allowGoogle && <><div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', margin: '4px 0' }}>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#3f4147' }} />
          <span style={{ fontSize: '11px', color: '#949ba4', textTransform: 'uppercase', fontWeight: 'bold' }}>
            ou
          </span>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#3f4147' }} />
        </div>

        {/* Botão Oficial de Login com Google */}
        <button
          type="button"
          data-testid="btn-login-google"
          onClick={onLoginGoogle}
          disabled={isSubmitting}
          style={{
            width: '100%',
            height: '42px',
            backgroundColor: '#ffffff',
            color: '#1f1f1f',
            border: '1px solid #747775',
            borderRadius: '4px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            boxSizing: 'border-box'
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
            />
          </svg>
          <span>Entrar com Google</span>
        </button></>}

        {!allowGoogle && !allowMock && <p style={{ color: '#b5bac1', fontSize: 13 }}>Entre ou cadastre-se com e-mail e senha para acessar o servidor compartilhado.</p>}
        {/* Separador e Contas de Teste Offline R$0 */}
        {allowMock && <>
        <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#3f4147' }} />
          <span style={{ fontSize: '11px', color: '#949ba4', textTransform: 'uppercase' }}>
            ou use ambiente local R$0
          </span>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#3f4147' }} />
        </div>

        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button
            type="button"
            data-testid="btn-login-amigo-1"
            onClick={() => onLoginMock('amigo-1')}
            style={{
              width: '100%',
              height: '36px',
              backgroundColor: '#2b2d31',
              color: '#dbdee1',
              border: '1px solid #3f4147',
              borderRadius: '4px',
              fontSize: '13px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            Entrar como Amigo Um (Dono)
          </button>
          <button
            type="button"
            data-testid="btn-login-amigo-2"
            onClick={() => onLoginMock('amigo-2')}
            style={{
              width: '100%',
              height: '36px',
              backgroundColor: '#2b2d31',
              color: '#dbdee1',
              border: '1px solid #3f4147',
              borderRadius: '4px',
              fontSize: '13px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            Entrar como Amigo Dois
          </button>
          <button
            type="button"
            data-testid="btn-login-amigo-3"
            onClick={() => onLoginMock('amigo-3')}
            style={{
              width: '100%',
              height: '36px',
              backgroundColor: '#2b2d31',
              color: '#dbdee1',
              border: '1px solid #3f4147',
              borderRadius: '4px',
              fontSize: '13px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            Entrar como Amigo Três
          </button>
        </div></>}
      </div>
    </div>
  );
};
