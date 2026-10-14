import React from 'react';

export interface VoiceControlsProps {
  isMuted: boolean;
  isDeafened: boolean;
  isScreenSharing: boolean;
  isConnected: boolean;
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
  onToggleMute,
  onToggleDeafen,
  onToggleScreenShare,
  onDisconnect
}) => {
  return (
    <div
      data-testid="voice-controls"
      style={{
        padding: '8px',
        backgroundColor: '#111214',
        borderTop: '1px solid #2b2d31',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}
    >
      <div style={{ display: 'flex', flex: '1 1 100%', minWidth: 0, flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
        <button
          data-testid="btn-mute"
          onClick={onToggleMute}
          style={{
            background: isMuted ? '#da373c' : '#313338',
            color: '#ffffff',
            border: 'none',
            borderRadius: '4px',
            padding: '6px 10px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          {isMuted ? 'Mutado' : 'Microfone'}
        </button>

        <button
          data-testid="btn-deafen"
          onClick={onToggleDeafen}
          style={{
            background: isDeafened ? '#da373c' : '#313338',
            color: '#ffffff',
            border: 'none',
            borderRadius: '4px',
            padding: '6px 10px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          {isDeafened ? 'Surdo' : 'Áudio'}
        </button>

        <button
          data-testid="btn-screen-share"
          onClick={onToggleScreenShare}
          style={{
            background: isScreenSharing ? '#23a55a' : '#313338',
            color: '#ffffff',
            border: 'none',
            borderRadius: '4px',
            padding: '6px 10px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          {isScreenSharing ? 'Compartilhando' : 'Compartilhar Tela'}
        </button>
      </div>

      {isConnected && (
        <button
          data-testid="btn-disconnect"
          onClick={onDisconnect}
          style={{
            background: '#da373c',
            color: '#ffffff',
            border: 'none',
            borderRadius: '4px',
            padding: '6px 10px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          Desconectar
        </button>
      )}
    </div>
  );
};
