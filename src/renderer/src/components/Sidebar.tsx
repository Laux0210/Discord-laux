import React from 'react';
import type { Guild } from '../../../common/types';

export interface SidebarProps {
  currentGuildName?: string;
  guilds?: Guild[];
  selectedGuildId?: string | null;
  onSelectGuild?: (guildId: string) => void;
  onSelectDmHome?: () => void;
  onOpenCreateGuild?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentGuildName,
  guilds = [],
  selectedGuildId,
  onSelectGuild,
  onSelectDmHome,
  onOpenCreateGuild
}) => {
  // Se guilds estiver vazio mas currentGuildName estiver fornecido, simula item para retrocompatibilidade
  const displayGuilds: Guild[] =
    guilds.length > 0
      ? guilds
      : currentGuildName
        ? [{ id: 'guild-default', name: currentGuildName, ownerId: 'default' }]
        : [];

  return (
    <aside
      data-testid="sidebar"
      style={{
        width: '72px',
        backgroundColor: '#1e1f22',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '12px 0',
        gap: '8px'
      }}
    >
      <button
        type="button"
        aria-label="Abrir amigos e mensagens diretas"
        data-testid="btn-dm-home"
        title="Mensagens Diretas"
        onClick={onSelectDmHome}
        style={{
          border: 0,
          font: 'inherit',
          width: '48px',
          height: '48px',
          borderRadius: '24px',
          backgroundColor: '#5865f2',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          fontWeight: 'bold',
          cursor: 'pointer'
        }}
      >
        DM
      </button>
      <div style={{ width: '32px', height: '2px', backgroundColor: '#35363c', margin: '4px 0' }} />

      {displayGuilds.map((g) => {
        const isSelected = g.id === selectedGuildId;
        const initials = g.name
          .split(' ')
          .map((n) => n[0])
          .join('')
          .substring(0, 2)
          .toUpperCase();

        return (
          <button
            type="button"
            aria-label={`Abrir servidor ${g.name}`}
            aria-pressed={isSelected}
            key={g.id}
            data-testid={`guild-item-${g.id}`}
            title={g.name}
            onClick={() => onSelectGuild?.(g.id)}
            style={{
              font: 'inherit',
              width: '48px',
              height: '48px',
              borderRadius: isSelected ? '16px' : '24px',
              backgroundColor: isSelected ? '#5865f2' : '#2b2d31',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontWeight: 'bold',
              cursor: 'pointer',
              border: isSelected ? '2px solid #5865f2' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            {initials || 'CD'}
          </button>
        );
      })}

      {onOpenCreateGuild && <button
        type="button"
        aria-label="Adicionar ou entrar em comunidade"
        data-testid="btn-add-guild"
        title="Adicionar ou entrar em comunidade"
        onClick={onOpenCreateGuild}
        style={{
          width: '48px',
          height: '48px',
          borderRadius: '24px',
          backgroundColor: '#313338',
          color: '#23a55a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '22px',
          border: 0,
          fontFamily: 'inherit',
          cursor: 'pointer',
          marginTop: '4px'
        }}
      >
        +
      </button>}
    </aside>
  );
};
