import React from 'react';
import type { Channel } from '../../../common/types';

export interface ChannelListProps {
  channels: Channel[];
  selectedChannelId: string;
  onSelectChannel: (channelId: string) => void;
}

export const ChannelList: React.FC<ChannelListProps> = ({
  channels,
  selectedChannelId,
  onSelectChannel
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
                fontSize: '14px'
              }}
            >
              <span style={{ marginRight: '6px', color: '#80848e' }}>#</span>
              <span>{channel.name}</span>
            </div>
          );
        })}
      </div>

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
          return (
            <div
              key={channel.id}
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
                fontSize: '14px'
              }}
            >
              <span style={{ marginRight: '6px', color: '#80848e' }}>🔊</span>
              <span>{channel.name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
