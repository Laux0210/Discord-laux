import React, { useRef, useEffect } from 'react';
import type { Channel, VoiceParticipant } from '../../../common/types';

export interface VoiceRoomAreaProps {
  channel: Channel;
  participants: VoiceParticipant[];
  activeScreenShareUserId?: string | null;
  currentUserId?: string;
  onDisconnect?: () => void;
  onToggleScreenShare?: () => void;
  onSimulateFriendJoin?: () => void;
  isScreenSharing?: boolean;
  screenStream?: MediaStream | null;
}

export const VoiceRoomArea: React.FC<VoiceRoomAreaProps> = ({
  channel,
  participants,
  activeScreenShareUserId,
  currentUserId,
  onDisconnect,
  onToggleScreenShare,
  onSimulateFriendJoin,
  isScreenSharing,
  screenStream
}) => {
  const activeStreamer = participants.find((p) => p.userId === activeScreenShareUserId);
  const spectatorsCount = Math.max(0, participants.length - (activeStreamer ? 1 : 0));
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && screenStream) {
      videoRef.current.srcObject = screenStream;
    }
  }, [screenStream, activeScreenShareUserId]);

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
          {onSimulateFriendJoin && (
            <button
              data-testid="btn-room-add-friend"
              onClick={onSimulateFriendJoin}
              title="Simula a entrada de Amigo Dois na chamada de voz para testes de ocupação"
              style={{
                backgroundColor: '#2b2d31',
                color: '#dbdee1',
                border: '1px solid #3f4147',
                borderRadius: '4px',
                padding: '6px 10px',
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <span>+ Amigo na Chamada</span>
            </button>
          )}

          {onToggleScreenShare && (
            <button
              data-testid="btn-room-screen-share"
              onClick={onToggleScreenShare}
              style={{
                backgroundColor: isScreenSharing ? '#23a55a' : '#4e5058',
                color: '#ffffff',
                border: 'none',
                borderRadius: '4px',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect width="20" height="14" x="2" y="3" rx="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
              <span>{isScreenSharing ? 'Parar Tela' : 'Compartilhar Tela'}</span>
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
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08a.996.996 0 0 1 0-1.41C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.39.39.39 1.02 0 1.41l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.1-.7-.28-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z" />
              </svg>
              <span>Desconectar</span>
            </button>
          )}
        </div>
      </header>

      {/* Conteúdo Central: Tela Compartilhada e Grid de Participantes */}
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
              backgroundColor: '#1e1f22',
              borderRadius: '8px',
              border: '2px solid #23a55a',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              minHeight: '280px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)'
            }}
          >
            {/* Barra Superior da Transmissão */}
            <div
              style={{
                backgroundColor: '#111214',
                padding: '8px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid #2b2d31'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    backgroundColor: '#da373c',
                    color: '#ffffff',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    letterSpacing: '0.5px'
                  }}
                >
                  AO VIVO
                </span>
                <span style={{ fontWeight: 'bold', color: '#f2f3f5', fontSize: '14px' }}>
                  Transmissão de Tela Ativa: {activeStreamer.displayName}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', color: '#949ba4' }}>
                <span style={{ backgroundColor: '#2b2d31', padding: '2px 8px', borderRadius: '4px' }}>
                  720p / 30fps
                </span>
                <span>{spectatorsCount} espectador(es) assistindo</span>
              </div>
            </div>

            {/* Vídeo Real da Transmissão ou Simulação de Fallback */}
            {screenStream && activeStreamer.userId === currentUserId ? (
              <div
                style={{
                  flex: 1,
                  backgroundColor: '#000000',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '8px',
                  minHeight: '280px'
                }}
              >
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  data-testid="live-screen-video"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '420px',
                    borderRadius: '4px',
                    objectFit: 'contain',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.7)'
                  }}
                />
              </div>
            ) : (
              <div
                style={{
                  flex: 1,
                  backgroundColor: '#18191c',
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  position: 'relative',
                  background: 'linear-gradient(135deg, #1e1f22 0%, #111214 100%)'
                }}
              >
                <div
                  style={{
                    width: '90%',
                    maxWidth: '560px',
                    backgroundColor: '#2b2d31',
                    borderRadius: '6px',
                    border: '1px solid #35373c',
                    padding: '16px',
                    fontFamily: 'monospace',
                    fontSize: '13px',
                    color: '#dbdee1'
                  }}
                >
                  <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#da373c' }} />
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#f0b232' }} />
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#23a55a' }} />
                    <span style={{ color: '#949ba4', fontSize: '11px', marginLeft: '8px' }}>
                      workspace - Discord Desktop Stream
                    </span>
                  </div>
                  <div style={{ color: '#5865f2' }}>// Transmissão de tela em tempo real</div>
                  <div style={{ color: '#23a55a' }}>const status = &apos;Ao vivo com amigos&apos;;</div>
                  <div style={{ color: '#949ba4', marginTop: '6px' }}>
                    {activeStreamer.userId === currentUserId
                      ? '▶ Você está transmitindo sua tela para o canal.'
                      : `▶ Assistindo à tela de ${activeStreamer.displayName}.`}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Grid de Participantes Conectados */}
        <div
          data-testid="voice-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '12px',
            flex: 1
          }}
        >
          {participants.map((p) => {
            const isMe = p.userId === currentUserId;
            const isSpeaking = Boolean(p.isSpeaking);

            return (
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
                  minHeight: '130px',
                  border: isSpeaking
                    ? '2px solid #23a55a'
                    : p.isScreenSharing
                    ? '2px solid #5865f2'
                    : '1px solid #1e1f22',
                  boxShadow: isSpeaking ? '0 0 12px rgba(35, 165, 90, 0.4)' : 'none',
                  transition: 'border 0.15s ease, box-shadow 0.15s ease'
                }}
              >
                {/* Avatar com anel de fala dinâmico */}
                <div
                  style={{
                    width: '54px',
                    height: '54px',
                    borderRadius: '50%',
                    backgroundColor: '#5865f2',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    fontSize: '20px',
                    fontWeight: 'bold',
                    marginBottom: '8px',
                    border: isSpeaking ? '3px solid #23a55a' : '3px solid transparent',
                    boxShadow: isSpeaking ? '0 0 10px rgba(35, 165, 90, 0.9)' : 'none',
                    transition: 'border 0.15s ease, box-shadow 0.15s ease'
                  }}
                >
                  {p.displayName.charAt(0).toUpperCase()}
                </div>

                <div
                  style={{
                    fontWeight: '600',
                    color: '#f2f3f5',
                    fontSize: '14px',
                    textAlign: 'center',
                    maxWidth: '160px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {p.displayName} {isMe && '(Você)'}
                </div>

                {/* Badges de Status de Mídia */}
                <div style={{ display: 'flex', gap: '4px', marginTop: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
                  {isSpeaking && (
                    <span
                      style={{
                        backgroundColor: '#23a55a',
                        color: '#ffffff',
                        fontSize: '10px',
                        fontWeight: 600,
                        padding: '2px 6px',
                        borderRadius: '4px'
                      }}
                    >
                      Falando
                    </span>
                  )}
                  {p.isMuted && (
                    <span
                      style={{
                        backgroundColor: '#da373c',
                        color: '#ffffff',
                        fontSize: '10px',
                        fontWeight: 600,
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
                        fontWeight: 600,
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
                        fontWeight: 600,
                        padding: '2px 6px',
                        borderRadius: '4px'
                      }}
                    >
                      AO VIVO
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
};
