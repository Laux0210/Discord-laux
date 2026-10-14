import React, { useState } from 'react';
import type { FriendshipStatus, PresenceService } from '../../../common/text-types';

export interface FriendEntry {
  friendId: string;
  displayName: string;
  status: FriendshipStatus;
  activity?: string;
}

export interface FriendsAreaProps {
  friends: FriendEntry[];
  currentUserId: string;
  onSendFriendRequest: (targetUserId: string) => void | Promise<void>;
  onAcceptFriendRequest: (friendId: string) => void;
  onOpenDm: (friendId: string) => void;
  presenceService?: PresenceService;
}

const DEFAULT_ACTIVE_NOW = [
  {
    name: 'GABS e Senfador',
    game: 'ARK Survival Ascended',
    detail: '2h de jogo',
    avatar: 'GA',
    color: '#5865f2'
  },
  {
    name: 'Joga Brasil ARK ASA',
    game: 'Bate Papo',
    detail: 'Canal de voz ativo',
    avatar: 'JB',
    color: '#23a55a'
  },
  {
    name: 'At Level 217',
    game: 'Surviving on: Ragnarok',
    detail: 'Servidor Público #01',
    avatar: 'AL',
    color: '#f0b232',
    canJoin: true
  },
  {
    name: 'Anjo Silva',
    game: 'ARK: Survival Evolved',
    detail: '1h de jogo',
    avatar: 'AS',
    color: '#eb459e'
  },
  {
    name: 'gmrt',
    game: 'ROBLOX',
    detail: '8m de jogo',
    avatar: 'GM',
    color: '#5865f2'
  },
  {
    name: 'Ricelli???',
    game: 'Phasmophobia',
    detail: '14m de jogo',
    avatar: 'RI',
    color: '#da373c'
  },
  {
    name: 'Senhorita',
    game: 'ROBLOX',
    detail: '41m de jogo',
    avatar: 'SE',
    color: '#5865f2'
  }
];

export const FriendsArea: React.FC<FriendsAreaProps> = ({
  friends,
  onSendFriendRequest,
  onAcceptFriendRequest,
  onOpenDm,
  presenceService
}) => {
  const [activeTab, setActiveTab] = useState<'available' | 'all' | 'pending' | 'blocked' | 'add'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [targetIdInput, setTargetIdInput] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [hasRequestError, setHasRequestError] = useState(false);

  const acceptedFriends = friends.filter((f) => f.status === 'accepted');
  const pendingFriends = friends.filter((f) => f.status === 'pending');

  const filteredFriends = acceptedFriends.filter((f) => {
    const matchesSearch = f.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          f.friendId.toLowerCase().includes(searchQuery.toLowerCase());
    if (activeTab === 'available') {
      const p = presenceService ? presenceService.getPresence(f.friendId) : 'online';
      return matchesSearch && p !== 'offline';
    }
    return matchesSearch;
  });

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetIdInput.trim()) return;
    setFeedback(null);
    setHasRequestError(false);
    try {
      await onSendFriendRequest(targetIdInput.trim());
      setFeedback('Pedido de amizade enviado com sucesso!');
      setTargetIdInput('');
    } catch (err: any) {
      setHasRequestError(true);
      setFeedback(err?.message || 'Erro ao enviar pedido');
    }
  };

  return (
    <div
      data-testid="friends-area"
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#313338',
        color: '#dbdee1',
        overflow: 'hidden'
      }}
    >
      {/* 1. Header estilo Discord Oficial */}
      <header
        style={{
          height: '48px',
          borderBottom: '1px solid #202225',
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          gap: '12px',
          backgroundColor: '#313338',
          flexShrink: 0
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#80848e' }}>
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
          </svg>
          <span style={{ fontWeight: 'bold', color: '#f2f3f5', fontSize: '15px' }}>Amigos</span>
        </div>

        <div style={{ width: '1px', height: '16px', backgroundColor: '#3f4147' }} />

        {/* Abas */}
        <button
          onClick={() => { setActiveTab('available'); setFeedback(null); }}
          style={{
            backgroundColor: activeTab === 'available' ? '#404249' : 'transparent',
            color: activeTab === 'available' ? '#ffffff' : '#b5bac1',
            border: 'none',
            borderRadius: '4px',
            padding: '4px 10px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 500,
            transition: 'background 0.15s ease'
          }}
        >
          Disponível
        </button>

        <button
          data-testid="tab-friends-all"
          onClick={() => { setActiveTab('all'); setFeedback(null); }}
          style={{
            backgroundColor: activeTab === 'all' ? '#404249' : 'transparent',
            color: activeTab === 'all' ? '#ffffff' : '#b5bac1',
            border: 'none',
            borderRadius: '4px',
            padding: '4px 10px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 500,
            transition: 'background 0.15s ease'
          }}
        >
          Todos ({acceptedFriends.length})
        </button>

        <button
          data-testid="tab-friends-pending"
          onClick={() => { setActiveTab('pending'); setFeedback(null); }}
          style={{
            backgroundColor: activeTab === 'pending' ? '#404249' : 'transparent',
            color: activeTab === 'pending' ? '#ffffff' : '#b5bac1',
            border: 'none',
            borderRadius: '4px',
            padding: '4px 10px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 500,
            transition: 'background 0.15s ease'
          }}
        >
          Pendente {pendingFriends.length > 0 && `(${pendingFriends.length})`}
        </button>

        <button
          onClick={() => { setActiveTab('blocked'); setFeedback(null); }}
          style={{
            backgroundColor: activeTab === 'blocked' ? '#404249' : 'transparent',
            color: activeTab === 'blocked' ? '#ffffff' : '#b5bac1',
            border: 'none',
            borderRadius: '4px',
            padding: '4px 10px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 500
          }}
        >
          Bloqueado
        </button>

        <button
          data-testid="tab-friends-add"
          onClick={() => { setActiveTab('add'); setFeedback(null); }}
          style={{
            backgroundColor: activeTab === 'add' ? '#248046' : '#23a55a',
            color: '#ffffff',
            border: 'none',
            borderRadius: '4px',
            padding: '4px 12px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 'bold',
            marginLeft: '4px'
          }}
        >
          Adicionar amigo
        </button>
      </header>

      {/* 2. Corpo Principal: Lista Central + Painel "Ativo Agora" */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Coluna Central de Amigos */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px 24px', overflowY: 'auto' }}>
          {/* Campo de Busca de Amigos */}
          {(activeTab === 'all' || activeTab === 'available') && (
            <div style={{ position: 'relative', marginBottom: '20px' }}>
              <input
                type="text"
                placeholder="Buscar"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 36px',
                  backgroundColor: '#1e1f22',
                  border: '1px solid #202225',
                  borderRadius: '4px',
                  color: '#f2f3f5',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '11px',
                  color: '#949ba4'
                }}
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
          )}

          {/* Lista de Amigos Aceitos */}
          {(activeTab === 'all' || activeTab === 'available') && (
            <div>
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 'bold',
                  color: '#949ba4',
                  textTransform: 'uppercase',
                  marginBottom: '12px',
                  letterSpacing: '0.5px'
                }}
              >
                Online — {filteredFriends.length}
              </div>

              {filteredFriends.length === 0 ? (
                <div style={{ color: '#949ba4', textAlign: 'center', marginTop: '60px', fontSize: '14px' }}>
                  Nenhum amigo encontrado nessa categoria.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {filteredFriends.map((f) => {
                    const presence = presenceService ? presenceService.getPresence(f.friendId) : 'online';
                    const activity = f.activity || (f.friendId === 'user-2' ? '🎮 ROBLOX' : 'Disponível');

                    return (
                      <div
                        key={f.friendId}
                        data-testid={`friend-row-${f.friendId}`}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 14px',
                          borderRadius: '6px',
                          borderTop: '1px solid #2b2d31',
                          backgroundColor: 'transparent',
                          transition: 'background 0.15s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div
                            style={{
                              width: '38px',
                              height: '38px',
                              borderRadius: '50%',
                              backgroundColor: '#5865f2',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 'bold',
                              color: '#ffffff',
                              position: 'relative',
                              fontSize: '14px'
                            }}
                          >
                            {f.displayName.substring(0, 2).toUpperCase()}
                            <div
                              title={presence}
                              style={{
                                position: 'absolute',
                                bottom: '-2px',
                                right: '-2px',
                                width: '12px',
                                height: '12px',
                                borderRadius: '50%',
                                backgroundColor: presence === 'online' ? '#23a55a' : presence === 'idle' ? '#f0b232' : '#80848e',
                                border: '2px solid #313338'
                              }}
                            />
                          </div>

                          <div>
                            <div style={{ fontWeight: 'bold', color: '#f2f3f5', fontSize: '14px' }}>
                              {f.displayName}
                            </div>
                            <div style={{ fontSize: '12px', color: '#949ba4' }}>
                              {activity}
                            </div>
                          </div>
                        </div>

                        {/* Botões de Ação na Linha do Amigo */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <button
                            data-testid={`btn-open-dm-${f.friendId}`}
                            onClick={() => onOpenDm(f.friendId)}
                            title="Mensagem Direta"
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '50%',
                              backgroundColor: '#2b2d31',
                              border: 'none',
                              color: '#b5bac1',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              transition: 'background 0.15s, color 0.15s'
                            }}
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
                            </svg>
                          </button>

                          <button
                            title="Mais opções"
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '50%',
                              backgroundColor: '#2b2d31',
                              border: 'none',
                              color: '#b5bac1',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer'
                            }}
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                              <circle cx="12" cy="5" r="2" />
                              <circle cx="12" cy="12" r="2" />
                              <circle cx="12" cy="19" r="2" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Aba Pendentes */}
          {activeTab === 'pending' && (
            <div>
              <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#949ba4', textTransform: 'uppercase', marginBottom: '14px' }}>
                Pedidos Pendentes — {pendingFriends.length}
              </div>

              {pendingFriends.length === 0 ? (
                <div style={{ color: '#949ba4', textAlign: 'center', marginTop: '40px' }}>
                  Nenhum pedido pendente no momento.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {pendingFriends.map((f) => (
                    <div
                      key={f.friendId}
                      data-testid={`pending-row-${f.friendId}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        backgroundColor: '#2b2d31',
                        borderRadius: '6px'
                      }}
                    >
                      <span style={{ fontWeight: 'bold', color: '#f2f3f5' }}>{f.displayName}</span>
                      <button
                        data-testid={`btn-accept-${f.friendId}`}
                        onClick={() => onAcceptFriendRequest(f.friendId)}
                        style={{
                          backgroundColor: '#23a55a',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '6px 14px',
                          fontWeight: 'bold',
                          fontSize: '13px',
                          cursor: 'pointer'
                        }}
                      >
                        Aceitar
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Aba Adicionar Amigo */}
          {activeTab === 'add' && (
            <div style={{ maxWidth: '540px' }}>
              <h3 style={{ fontSize: '16px', color: '#f2f3f5', marginBottom: '6px' }}>
                Adicionar Amigo
              </h3>
              <p style={{ fontSize: '13px', color: '#949ba4', marginBottom: '16px' }}>
                Você pode adicionar amigos digitando o identificador deles.
              </p>
              <form onSubmit={handleAddSubmit} style={{ display: 'flex', gap: '8px' }}>
                <input
                  data-testid="input-friend-id"
                  type="text"
                  value={targetIdInput}
                  onChange={(e) => setTargetIdInput(e.target.value)}
                  placeholder="Insira o ID do usuário (ex: user-2)"
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    backgroundColor: '#1e1f22',
                    border: '1px solid #202225',
                    borderRadius: '4px',
                    color: '#f2f3f5',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
                <button
                  data-testid="btn-submit-friend-request"
                  type="submit"
                  style={{
                    backgroundColor: '#5865f2',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '0 18px',
                    fontWeight: 'bold',
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  Enviar Pedido
                </button>
              </form>
              {feedback && (
                <div role={hasRequestError ? 'alert' : 'status'} style={{ marginTop: '12px', fontSize: '13px', color: hasRequestError ? '#f23f43' : '#23a55a' }}>
                  {feedback}
                </div>
              )}
            </div>
          )}

          {/* Aba Bloqueados */}
          {activeTab === 'blocked' && (
            <div style={{ color: '#949ba4', textAlign: 'center', marginTop: '60px', fontSize: '14px' }}>
              Você não tem nenhum usuário bloqueado.
            </div>
          )}
        </div>

        {/* 3. Coluna Lateral Direita: "Ativo Agora" (Espelhando AOt6ZYxG.png) */}
        <aside
          style={{
            width: '320px',
            borderLeft: '1px solid #202225',
            padding: '16px',
            overflowY: 'auto',
            backgroundColor: '#313338',
            flexShrink: 0
          }}
        >
          <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#f2f3f5', marginBottom: '16px' }}>
            Ativo agora
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {DEFAULT_ACTIVE_NOW.map((item, idx) => (
              <div
                key={idx}
                style={{
                  backgroundColor: '#2b2d31',
                  borderRadius: '8px',
                  padding: '12px',
                  border: '1px solid #35373c',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  transition: 'background 0.15s ease'
                }}
              >
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: item.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    color: '#ffffff',
                    fontSize: '14px',
                    flexShrink: 0
                  }}
                >
                  {item.avatar}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 'bold', color: '#f2f3f5', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.name}
                  </div>
                  <div style={{ fontSize: '12px', color: '#dbdee1', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.game}
                  </div>
                  <div style={{ fontSize: '11px', color: '#949ba4' }}>
                    {item.detail}
                  </div>
                </div>

                {item.canJoin && (
                  <button
                    style={{
                      backgroundColor: '#4e5058',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '4px 8px',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Juntar-se
                  </button>
                )}
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
};
