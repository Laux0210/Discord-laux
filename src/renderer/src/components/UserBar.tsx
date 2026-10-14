import React from 'react';
import type { User } from '../../../common/types';

export interface UserBarProps {
  user: User | null;
  onLogout?: () => void;
}

export const UserBar: React.FC<UserBarProps> = ({ user, onLogout }) => {
  return (
    <div
      data-testid="user-bar"
      style={{
        height: '52px',
        backgroundColor: '#232428',
        display: 'flex',
        alignItems: 'center',
        padding: '0 8px',
        gap: '8px'
      }}
    >
      <div
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '16px',
          backgroundColor: '#5865f2',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 'bold',
          color: '#ffffff',
          fontSize: '12px',
          position: 'relative'
        }}
      >
        {user ? user.displayName.substring(0, 2).toUpperCase() : '??'}
        <div
          title="Online"
          style={{
            position: 'absolute',
            bottom: '-2px',
            right: '-2px',
            width: '10px',
            height: '10px',
            borderRadius: '5px',
            backgroundColor: '#23a55a',
            border: '2px solid #232428'
          }}
        />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: '14px',
            fontWeight: 'bold',
            color: '#f2f3f5',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}
        >
          {user?.displayName ?? 'Não conectado'}
        </div>
        <div style={{ fontSize: '12px', color: '#949ba4' }}>Online</div>
      </div>

      {onLogout && (
        <button
          data-testid="btn-logout"
          onClick={onLogout}
          title="Sair da conta"
          style={{
            backgroundColor: 'transparent',
            border: 'none',
            color: '#949ba4',
            cursor: 'pointer',
            padding: '4px 6px',
            borderRadius: '4px',
            fontSize: '12px'
          }}
        >
          Sair
        </button>
      )}
    </div>
  );
};
