import React from 'react';
import type { Channel, VoiceParticipant } from '../../../common/types';

export interface VoiceRoomAreaProps {
  channel: Channel;
  participants: VoiceParticipant[];
  activeScreenShareUserId?: string | null;
  currentUserId?: string;
  onDisconnect?: () => void;
  onToggleScreenShare?: () => void;
  isScreenSharing?: boolean;
}

export const VoiceRoomArea: React.FC<VoiceRoomAreaProps> = ({
  channel,
  participants,
  activeScreenShareUserId,
  currentUserId: _currentUserId,
  onDisconnect,
  onToggleScreenShare,
  isScreenSharing
}) => {
  const activeStreamer = participants.find((p) => p.userId === activeScreenShareUserId);
  const spectatorsCount = Math.max(0, participants.length - (activeStreamer ? 1 : 0));

  return (
    <main
      data-testid="voice-room-area"
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#313338',
        color: '#dbdee1',
        overflow: 'hidden'
      }}
    >
      {/* Cabeçalho da Sala de Voz */}
      <header
        style={{
          height: '48px',
          borderBottom: '1px solid #202225',
          padding: '0 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#313338'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '20px', color: '#80848e' }}>🔊</span>
          <span style={{ fontWeight: 'bold', color: '#f2f3f5' }}>{channel.name}</span>
          <span style={{ fontSize: '12px', color: '#949ba4' }}>
            {`(${participants.length}/10 participantes)`}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {onToggleScreenShare && (
            <button
              onClick={onToggleScreenShare}
              style={{
                backgroundColor: isScreenSharing ? '#23a55a' : '#4e5058',
                color: '#ffffff',
                border: 'none',
                borderRadius: '4px',
                padding: '6px 12px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              {isScreenSharing ? 'Parar Tela' : 'Compartilhar Tela'}
            </button>
          )}

          {onDisconnect && (
            <button
              onClick={onDisconnect}
              style={{
                backgroundColor: '#da373c',
                color: '#ffffff',
                border: 'none',
                borderRadius: '4px',
                padding: '6px 12px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              Desconectar
            </button>
          )}
        </div>
      </header>

      {/* Conteúdo Central: Tela Compartilhada (se houver) e Grid de Participantes */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: '16px',
          gap: '16px',
          overflowY: 'auto'
        }}
      >
        {activeScreenShareUserId && activeStreamer && (
          <div
            data-testid="screen-share-view"
            style={{
              backgroundColor: '#111214',
              borderRadius: '8px',
              border: '1px solid #23a55a',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '220px'
            }}
          >
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🖥️</div>
            <div style={{ fontWeight: 'bold', color: '#f2f3f5', fontSize: '16px' }}>
              Transmissão de Tela Ativa: {activeStreamer.displayName}
            </div>
            <div style={{ fontSize: '13px', color: '#949ba4', marginTop: '4px' }}>
              Qualidade: 720p / 30fps | {spectatorsCount} espectador(es) assistindo
            </div>
          </div>
        )}

        {/* Grid de Participantes da Chamada */}
        <div
          data-testid="voice-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '12px',
            flex: 1
          }}
        >
          {participants.map((p) => (
            <div
              key={p.userId}
              style={{
                backgroundColor: '#2b2d31',
                borderRadius: '8px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                minHeight: '120px',
                border: p.isScreenSharing ? '2px solid #23a55a' : '1px solid #1e1f22'
              }}
            >
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  backgroundColor: '#5865f2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  marginBottom: '8px'
                }}
              >
                {p.displayName.charAt(0).toUpperCase()}
              </div>

              <div style={{ fontWeight: '600', color: '#f2f3f5', fontSize: '14px' }}>
                {p.displayName}
              </div>

              {/* Badges de Status de Mídia */}
              <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
                {p.isMuted && (
                  <span
                    style={{
                      backgroundColor: '#da373c',
                      color: '#ffffff',
                      fontSize: '10px',
                      padding: '2px 6px',
                      borderRadius: '4px'
                    }}
                  >
                    Mutado
                  </span>
                )}
                {p.isDeafened && (
                  <span
                    style={{
                      backgroundColor: '#da373c',
                      color: '#ffffff',
                      fontSize: '10px',
                      padding: '2px 6px',
                      borderRadius: '4px'
                    }}
                  >
                    Surdo
                  </span>
                )}
                {p.isScreenSharing && (
                  <span
                    style={{
                      backgroundColor: '#23a55a',
                      color: '#ffffff',
                      fontSize: '10px',
                      padding: '2px 6px',
                      borderRadius: '4px'
                    }}
                  >
                    Transmitindo
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
};
