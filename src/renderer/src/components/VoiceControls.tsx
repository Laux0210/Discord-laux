import React from 'react';

export interface VoiceControlsProps {
  isMuted: boolean;
  isDeafened: boolean;
  isScreenSharing: boolean;
  isConnected: boolean;
  channelName?: string;
  onToggleMute: () => void;
  onToggleDeafen: () => void;
  onToggleScreenShare: () => void;
  onDisconnect: () => void;
}

export const VoiceControls: React.FC<VoiceControlsProps> = ({
  isScreenSharing,
  isConnected,
  channelName = 'Voz Principal',
  onToggleScreenShare,
  onDisconnect
}) => {
  return (
    <div
      data-testid="voice-controls"
      style={{
        backgroundColor: '#111214',
        borderTop: '1px solid #1f2023',
        display: 'flex',
        flexDirection: 'column',
        userSelect: 'none'
      }}
    >
      {/* Box de Voz Conectada estilo Discord Canônico (exibido quando em chamada de voz) */}
      {isConnected ? (
        <div
          data-testid="voice-connection-status"
          style={{
            padding: '8px 10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            backgroundColor: '#111214'
          }}
        >
          {/* Informações da Conexão RTC */}
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: '#23a55a', fontSize: '13px' }}>📶</span>
              <span style={{ color: '#23a55a', fontSize: '12px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                Voz Conectada
              </span>
            </div>
            <span
              style={{
                fontSize: '11px',
                color: '#949ba4',
                marginTop: '1px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
              title={channelName}
            >
              {channelName}
            </span>
          </div>

          {/* Botões de Ação na Chamada: Compartilhar Tela e Desconectar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            {/* Botão de Compartilhar Tela */}
            <button
              data-testid="btn-screen-share"
              onClick={onToggleScreenShare}
              title={isScreenSharing ? 'Parar Transmissão de Tela' : 'Compartilhar Tela'}
              style={{
                width: '32px',
                height: '32px',
                backgroundColor: isScreenSharing ? '#23a55a' : '#2b2d31',
                color: '#ffffff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.15s ease'
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect width="20" height="14" x="2" y="3" rx="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
                <path d="m16 9-4-4-4 4" />
                <line x1="12" y1="5" x2="12" y2="13" />
              </svg>
            </button>

            {/* Botão de Desconectar */}
            <button
              data-testid="btn-disconnect"
              onClick={onDisconnect}
              title="Desconectar da chamada de voz"
              style={{
                width: '32px',
                height: '32px',
                backgroundColor: '#da373c',
                color: '#ffffff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.15s ease'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08a.996.996 0 0 1 0-1.41C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.39.39.39 1.02 0 1.41l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.1-.7-.28-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z" />
              </svg>
            </button>
          </div>
        </div>
      ) : (
        /* Barra de prontidão de voz compacta quando não conectado */
        <div
          style={{
            padding: '6px 10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '11px',
            color: '#949ba4'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flex: 1 }}>
            <span style={{ color: '#80848e', fontSize: '13px' }}>🔊</span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {channelName}
            </span>
          </div>

          <button
            data-testid="btn-screen-share"
            onClick={onToggleScreenShare}
            title="Compartilhar Tela e entrar no canal de voz"
            style={{
              backgroundColor: '#2b2d31',
              color: '#dbdee1',
              border: 'none',
              borderRadius: '4px',
              padding: '4px 8px',
              fontSize: '11px',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              whiteSpace: 'nowrap',
              transition: 'background 0.15s ease'
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect width="20" height="14" x="2" y="3" rx="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
              <path d="m16 9-4-4-4 4" />
              <line x1="12" y1="5" x2="12" y2="13" />
            </svg>
            <span>Transmitir</span>
          </button>
        </div>
      )}
    </div>
  );
};
