import React from 'react';
import type { Channel, VoiceParticipant } from '../../../common/types';

export interface ChannelListProps {
  channels: Channel[];
  selectedChannelId: string;
  onSelectChannel: (channelId: string) => void;
  voiceParticipants?: VoiceParticipant[];
  activeVoiceChannelId?: string | null;
}

export const ChannelList: React.FC<ChannelListProps> = ({
  channels,
  selectedChannelId,
  onSelectChannel,
  voiceParticipants = [],
  activeVoiceChannelId = null
}) => {
  const textChannels = channels.filter((c) => c.type !== 'voice');
  const voiceChannels = channels.filter((c) => c.type === 'voice');

  return (
    <div
      data-testid="channel-list"
      style={{
        flex: 1,
        overflowY: 'auto',
        padding: '8px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}
    >
      {/* Seção Canais de Texto */}
      <div>
        <div
          style={{
            fontSize: '12px',
            fontWeight: 'bold',
            color: '#949ba4',
            textTransform: 'uppercase',
            marginBottom: '4px',
            padding: '0 8px'
          }}
        >
          Canais de Texto
        </div>
        {textChannels.map((channel) => {
          const isSelected = channel.id === selectedChannelId;
          return (
            <div
              key={channel.id}
              role="button"
              tabIndex={0}
              aria-label={`Abrir canal de texto ${channel.name}`}
              aria-current={isSelected ? 'page' : undefined}
              onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelectChannel(channel.id); } }}
              onClick={() => onSelectChannel(channel.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '6px 8px',
                borderRadius: '4px',
                backgroundColor: isSelected ? '#404249' : 'transparent',
                color: isSelected ? '#ffffff' : '#949ba4',
                cursor: 'pointer',
                marginBottom: '2px',
                fontSize: '14px',
                transition: 'background 0.15s ease'
              }}
            >
              <span style={{ marginRight: '6px', color: '#80848e' }}>#</span>
              <span>{channel.name}</span>
            </div>
          );
        })}
      </div>

      {/* Seção Canais de Voz */}
      <div>
        <div
          style={{
            fontSize: '12px',
            fontWeight: 'bold',
            color: '#949ba4',
            textTransform: 'uppercase',
            marginBottom: '4px',
            padding: '0 8px'
          }}
        >
          Canais de Voz
        </div>
        {voiceChannels.map((channel) => {
          const isSelected = channel.id === selectedChannelId;
          const isActiveCallHere = activeVoiceChannelId === channel.id;
          const participantsHere = isActiveCallHere ? voiceParticipants : [];

          return (
            <div key={channel.id} style={{ marginBottom: '4px' }}>
              <div
                role="button"
                tabIndex={0}
                aria-label={`Abrir canal de voz ${channel.name}`}
                aria-current={isSelected ? 'page' : undefined}
                onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelectChannel(channel.id); } }}
                onClick={() => onSelectChannel(channel.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '6px 8px',
                  borderRadius: '4px',
                  backgroundColor: isSelected ? '#404249' : 'transparent',
                  color: isSelected ? '#ffffff' : '#949ba4',
                  cursor: 'pointer',
                  fontSize: '14px',
                  transition: 'background 0.15s ease'
                }}
              >
                <span style={{ marginRight: '6px', color: '#80848e' }}>🔊</span>
                <span style={{ flex: 1, fontWeight: 500 }}>{channel.name}</span>
                {participantsHere.length > 0 && (
                  <span
                    style={{
                      fontSize: '11px',
                      backgroundColor: '#232428',
                      color: '#23a55a',
                      padding: '1px 6px',
                      borderRadius: '10px',
                      fontWeight: 'bold'
                    }}
                  >
                    {participantsHere.length}
                  </span>
                )}
              </div>

              {/* Lista dos participantes conectados no canal de voz */}
              {participantsHere.length > 0 && (
                <div
                  data-testid={`voice-participants-${channel.id}`}
                  style={{
                    paddingLeft: '24px',
                    paddingRight: '4px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    marginTop: '4px',
                    marginBottom: '6px'
                  }}
                >
                  {participantsHere.map((p) => (
                    <div
                      key={p.userId}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '4px 6px',
                        borderRadius: '4px',
                        backgroundColor: '#232428',
                        fontSize: '13px',
                        color: '#dbdee1'
                      }}
                    >
                      <div
                        style={{
                          width: '22px',
                          height: '22px',
                          borderRadius: '11px',
                          backgroundColor: '#5865f2',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '10px',
                          fontWeight: 'bold',
                          color: '#ffffff',
                          flexShrink: 0
                        }}
                      >
                        {p.displayName.substring(0, 2).toUpperCase()}
                      </div>

                      <span
                        style={{
                          flex: 1,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {p.displayName}
                      </span>

                      {/* Badges de tela ou áudio */}
                      {p.isScreenSharing && (
                        <span
                          title="Transmitindo tela"
                          style={{
                            fontSize: '9px',
                            fontWeight: 'bold',
                            backgroundColor: '#23a55a',
                            color: '#ffffff',
                            padding: '1px 4px',
                            borderRadius: '3px'
                          }}
                        >
                          AO VIVO
                        </span>
                      )}
                      {p.isMuted && (
                        <span title="Microfone mutado" style={{ color: '#da373c', fontSize: '12px' }}>
                          🔇
                        </span>
                      )}
                      {p.isDeafened && (
                        <span title="Áudio desativado" style={{ color: '#da373c', fontSize: '12px' }}>
                          🎧❌
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
