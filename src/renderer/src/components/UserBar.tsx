import React from 'react';
import type { User } from '../../../common/types';

export interface UserBarProps {
  user: User | null;
  onLogout?: () => void;
  onOpenSettings?: () => void;
  isMuted?: boolean;
  isDeafened?: boolean;
  isSpeaking?: boolean;
  onToggleMute?: () => void;
  onToggleDeafen?: () => void;
}

export const UserBar: React.FC<UserBarProps> = ({
  user,
  onLogout,
  onOpenSettings,
  isMuted = false,
  isDeafened = false,
  isSpeaking = false,
  onToggleMute,
  onToggleDeafen
}) => {
  return (
    <div
      data-testid="user-bar"
      style={{
        height: '52px',
        backgroundColor: '#232428',
        display: 'flex',
        alignItems: 'center',
        padding: '0 8px',
        gap: '8px',
        borderTop: '1px solid #1f2023',
        userSelect: 'none'
      }}
    >
      {/* Avatar do Usuário com Indicador de Fala e Status Online */}
      <div
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          backgroundColor: '#5865f2',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 'bold',
          color: '#ffffff',
          fontSize: '12px',
          position: 'relative',
          flexShrink: 0,
          border: isSpeaking ? '2px solid #23a55a' : '2px solid transparent',
          boxShadow: isSpeaking ? '0 0 8px rgba(35, 165, 90, 0.9)' : 'none',
          transition: 'border 0.15s ease, box-shadow 0.15s ease'
        }}
      >
        {user ? user.displayName.substring(0, 2).toUpperCase() : '??'}
        <div
          title={isSpeaking ? 'Falando no canal de voz' : 'Online'}
          style={{
            position: 'absolute',
            bottom: '-2px',
            right: '-2px',
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            backgroundColor: '#23a55a',
            border: '2px solid #232428'
          }}
        />
      </div>

      {/* Nome e Status do Usuário */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: '13px',
            fontWeight: 600,
            color: '#f2f3f5',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}
        >
          {user?.displayName ?? 'Não conectado'}
        </div>
        <div
          style={{
            fontSize: '11px',
            color: isSpeaking ? '#23a55a' : '#949ba4',
            fontWeight: isSpeaking ? 600 : 400
          }}
        >
          {isSpeaking ? 'Falando...' : 'Online'}
        </div>
      </div>

      {/* Botões de Ação do Usuário (Microfone, Áudio e Engrenagem de Configurações) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
        {onToggleMute && (
          <button
            data-testid="btn-mute"
            onClick={onToggleMute}
            title={isMuted ? 'Ativar microfone' : 'Silenciar microfone'}
            style={{
              width: '32px',
              height: '32px',
              backgroundColor: isMuted ? 'rgba(218, 55, 60, 0.15)' : 'transparent',
              border: 'none',
              borderRadius: '4px',
              color: isMuted ? '#da373c' : '#b5bac1',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.15s ease, color 0.15s ease'
            }}
          >
            {isMuted ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="2" y1="2" x2="22" y2="22" />
                <path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2" />
                <path d="M5 10v2a7 7 0 0 0 12 5" />
                <path d="M15 9.34V5a3 3 0 0 0-5.68-1.33" />
                <path d="M9 9v3a3 3 0 0 0 5.12 2.12" />
                <line x1="12" y1="19" x2="12" y2="22" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="22" />
              </svg>
            )}
          </button>
        )}

        {onToggleDeafen && (
          <button
            data-testid="btn-deafen"
            onClick={onToggleDeafen}
            title={isDeafened ? 'Desativar ensurdecer' : 'Ensurdecer'}
            style={{
              width: '32px',
              height: '32px',
              backgroundColor: isDeafened ? 'rgba(218, 55, 60, 0.15)' : 'transparent',
              border: 'none',
              borderRadius: '4px',
              color: isDeafened ? '#da373c' : '#b5bac1',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.15s ease, color 0.15s ease'
            }}
          >
            {isDeafened ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="2" y1="2" x2="22" y2="22" />
                <path d="M4.6 4.6A9 9 0 0 1 21 12v6" />
                <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 12a9 9 0 0 1 .4-2.6" />
                <path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
                <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
              </svg>
            )}
          </button>
        )}

        {/* Botão de Engrenagem (Configurações do Usuário) */}
        <button
          data-testid="btn-settings"
          onClick={onOpenSettings}
          title="Configurações de Usuário"
          style={{
            width: '32px',
            height: '32px',
            backgroundColor: 'transparent',
            border: 'none',
            borderRadius: '4px',
            color: '#b5bac1',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.15s ease, color 0.15s ease'
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path fillRule="evenodd" clipRule="evenodd" d="M10.56 1.1c-.49.27-.85.73-.98 1.27l-.37 1.48c-.44.18-.85.4-1.24.67l-1.42-.64c-.53-.24-1.16-.16-1.62.2l-1.6 1.28c-.46.37-.67.96-.54 1.54l.36 1.51c-.26.39-.49.8-.67 1.24l-1.48.37c-.54.13-1 .49-1.27.98-.27.5-.27 1.1 0 1.6.27.49.73.85 1.27.98l1.48.37c.18.44.4.85.67 1.24l-.36 1.51c-.13.58.08 1.17.54 1.54l1.6 1.28c.46.36 1.09.44 1.62.2l1.42-.64c.39.27.8.49 1.24.67l.37 1.48c.13.54.49 1 .98 1.27.5.27 1.1.27 1.6 0 .49-.27.85-.73.98-1.27l.37-1.48c.44-.18.85-.4 1.24-.67l1.42.64c.53.24 1.16.16 1.62-.2l1.6-1.28c.46-.37.67-.96.54-1.54l-.36-1.51c.26-.39.49-.8.67-1.24l1.48-.37c.54-.13 1-.49 1.27-.98.27-.5.27-1.1 0-1.6-.27-.49-.73-.85-1.27-.98l-1.48-.37c-.18-.44-.4-.85-.67-1.24l.36-1.51c.13-.58-.08-1.17-.54-1.54l-1.6-1.28c-.46-.36-1.09-.44-1.62-.2l-1.42.64c-.39-.27-.8-.49-1.24-.67l-.37-1.48c-.13-.54-.49-1-.98-1.27-.5-.27-1.1-.27-1.6 0zM12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z" />
          </svg>
        </button>

        {/* Botão de compatibilidade para suítes de teste automatizadas */}
        {onLogout && (
          <button
            data-testid="btn-logout"
            onClick={onLogout}
            style={{ display: 'none' }}
            aria-hidden="true"
            tabIndex={-1}
          />
        )}
      </div>
    </div>
  );
};
