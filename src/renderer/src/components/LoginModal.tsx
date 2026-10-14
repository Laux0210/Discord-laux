import React from 'react';

export interface LoginModalProps {
  onLoginGoogle: () => void;
  onLoginMock: (username: string) => void;
  errorMessage?: string | null;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  onLoginGoogle,
  onLoginMock,
  errorMessage
}) => {
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
        color: '#f2f3f5'
      }}
    >
      <div
        style={{
          width: '420px',
          padding: '32px',
          backgroundColor: '#313338',
          borderRadius: '8px',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '20px'
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: 'bold' }}>
            Boas-vindas de volta!
          </h2>
          <p style={{ margin: 0, fontSize: '14px', color: '#949ba4' }}>
            Estamos muito animados em ver você novamente.
          </p>
        </div>

        {errorMessage && (
          <div
            data-testid="login-error"
            style={{
              width: '100%',
              padding: '10px 12px',
              backgroundColor: '#f23f43',
              color: '#ffffff',
              borderRadius: '4px',
              fontSize: '13px',
              textAlign: 'center'
            }}
          >
            {errorMessage}
          </div>
        )}

        <button
          data-testid="btn-login-google"
          onClick={onLoginGoogle}
          style={{
            width: '100%',
            height: '44px',
            backgroundColor: '#5865f2',
            color: '#ffffff',
            border: 'none',
            borderRadius: '4px',
            fontSize: '15px',
            fontWeight: 'bold',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px'
          }}
        >
          <span>Entrar com Google</span>
        </button>

        <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#3f4147' }} />
          <span style={{ fontSize: '11px', color: '#949ba4', textTransform: 'uppercase' }}>
            ou use ambiente local R$0
          </span>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#3f4147' }} />
        </div>

        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button
            data-testid="btn-login-amigo-1"
            onClick={() => onLoginMock('amigo-1')}
            style={{
              width: '100%',
              height: '38px',
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
            data-testid="btn-login-amigo-2"
            onClick={() => onLoginMock('amigo-2')}
            style={{
              width: '100%',
              height: '38px',
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
            data-testid="btn-login-amigo-3"
            onClick={() => onLoginMock('amigo-3')}
            style={{
              width: '100%',
              height: '38px',
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
        </div>
      </div>
    </div>
  );
};
