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
  isMuted,
  isDeafened,
  isScreenSharing,
  isConnected,
  channelName = 'Voz Principal',
  onToggleMute,
  onToggleDeafen,
  onToggleScreenShare,
  onDisconnect
}) => {
  return (
    <div
      data-testid="voice-controls"
      style={{
        backgroundColor: '#111214',
        borderTop: '1px solid #232428',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Box de Voz Conectada estilo Discord (exibido quando conectado) */}
      {isConnected && (
        <div
          data-testid="voice-connection-status"
          style={{
            padding: '8px 12px',
            borderBottom: '1px solid #1f2023',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#18191c'
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: '#23a55a', fontSize: '14px' }}>📶</span>
              <span style={{ color: '#23a55a', fontSize: '12px', fontWeight: 'bold' }}>
                Voz Conectada
              </span>
            </div>
            <span
              style={{
                fontSize: '11px',
                color: '#949ba4',
                marginTop: '1px',
                maxWidth: '130px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {channelName}
            </span>
          </div>

          <button
            data-testid="btn-disconnect"
            onClick={onDisconnect}
            title="Desconectar da chamada de voz"
            style={{
              background: '#da373c',
              color: '#ffffff',
              border: 'none',
              borderRadius: '4px',
              padding: '6px 8px',
              cursor: 'pointer',
              fontSize: '11px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontWeight: 600,
              transition: 'background 0.15s ease'
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08a.996.996 0 0 1 0-1.41C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.39.39.39 1.02 0 1.41l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.1-.7-.28-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z" />
            </svg>
            <span>Desconectar</span>
          </button>
        </div>
      )}

      {/* Barra de Ações: Microfone, Áudio e Compartilhar Tela */}
      <div
        style={{
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '6px'
        }}
      >
        {/* Botão Microfone */}
        <button
          data-testid="btn-mute"
          onClick={onToggleMute}
          title={isMuted ? 'Ativar Microfone' : 'Mutar Microfone'}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            background: isMuted ? '#da373c' : '#2b2d31',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            padding: '8px 6px',
            cursor: 'pointer',
            fontSize: '11px',
            fontWeight: 500,
            transition: 'background 0.15s ease'
          }}
        >
          {isMuted ? (
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="2" y1="2" x2="22" y2="22" />
              <path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2" />
              <path d="M5 10v2a7 7 0 0 0 12 5" />
              <path d="M15 9.34V5a3 3 0 0 0-5.68-1.33" />
              <path d="M9 9v3a3 3 0 0 0 5.12 2.12" />
              <line x1="12" y1="19" x2="12" y2="22" />
            </svg>
          ) : (
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="22" />
            </svg>
          )}
          <span>{isMuted ? 'Mutado' : 'Microfone'}</span>
        </button>

        {/* Botão Áudio / Ensurdecer */}
        <button
          data-testid="btn-deafen"
          onClick={onToggleDeafen}
          title={isDeafened ? 'Ativar Áudio' : 'Ensurdecer Áudio'}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            background: isDeafened ? '#da373c' : '#2b2d31',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            padding: '8px 6px',
            cursor: 'pointer',
            fontSize: '11px',
            fontWeight: 500,
            transition: 'background 0.15s ease'
          }}
        >
          {isDeafened ? (
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="2" y1="2" x2="22" y2="22" />
              <path d="M4.6 4.6A9 9 0 0 1 21 12v6" />
              <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 12a9 9 0 0 1 .4-2.6" />
              <path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
            </svg>
          ) : (
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
              <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
            </svg>
          )}
          <span>{isDeafened ? 'Surdo' : 'Áudio'}</span>
        </button>

        {/* Botão Compartilhar Tela */}
        <button
          data-testid="btn-screen-share"
          onClick={onToggleScreenShare}
          title={isScreenSharing ? 'Parar Transmissão' : 'Compartilhar Tela'}
          style={{
            flex: '1.2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            background: isScreenSharing ? '#23a55a' : '#2b2d31',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            padding: '8px 6px',
            cursor: 'pointer',
            fontSize: '11px',
            fontWeight: 500,
            transition: 'background 0.15s ease'
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect width="20" height="14" x="2" y="3" rx="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
            <path d="m16 9-4-4-4 4" />
            <line x1="12" y1="5" x2="12" y2="13" />
          </svg>
          <span>{isScreenSharing ? 'Transmitindo' : 'Compartilhar Tela'}</span>
        </button>
      </div>
    </div>
  );
};
