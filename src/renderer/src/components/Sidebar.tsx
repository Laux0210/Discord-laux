import React from 'react';

export interface SidebarProps {
  currentGuildName: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentGuildName }) => {
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
      <div
        title="Mensagens Diretas"
        style={{
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
      </div>
      <div style={{ width: '32px', height: '2px', backgroundColor: '#35363c', margin: '4px 0' }} />
      <div
        title={currentGuildName}
        style={{
          width: '48px',
          height: '48px',
          borderRadius: '16px',
          backgroundColor: '#2b2d31',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          fontWeight: 'bold',
          cursor: 'pointer',
          border: '2px solid #5865f2'
        }}
      >
        CA
      </div>
    </aside>
  );
};
