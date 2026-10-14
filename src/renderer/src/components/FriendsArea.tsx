import React, { useState } from 'react';
import type { FriendshipStatus, PresenceService } from '../../../common/text-types';

export interface FriendEntry {
  friendId: string;
  displayName: string;
  status: FriendshipStatus;
}

export interface FriendsAreaProps {
  friends: FriendEntry[];
  currentUserId: string;
  onSendFriendRequest: (targetUserId: string) => void | Promise<void>;
  onAcceptFriendRequest: (friendId: string) => void;
  onOpenDm: (friendId: string) => void;
  presenceService?: PresenceService;
}

export const FriendsArea: React.FC<FriendsAreaProps> = ({
  friends,
  onSendFriendRequest,
  onAcceptFriendRequest,
  onOpenDm,
  presenceService
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'add'>('all');
  const [targetIdInput, setTargetIdInput] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [hasRequestError, setHasRequestError] = useState(false);

  const acceptedFriends = friends.filter((f) => f.status === 'accepted');
  const pendingFriends = friends.filter((f) => f.status === 'pending');

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
        color: '#dbdee1'
      }}
    >
      {/* Header com Abas */}
      <header
        style={{
          height: '48px',
          borderBottom: '1px solid #202225',
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          gap: '16px'
        }}
      >
        <span style={{ fontWeight: 'bold', color: '#f2f3f5', fontSize: '15px' }}>Amigos</span>
        <div style={{ width: '1px', height: '16px', backgroundColor: '#3f4147' }} />

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
            fontWeight: '500'
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
            fontWeight: '500'
          }}
        >
          Pendentes ({pendingFriends.length})
        </button>

        <button
          data-testid="tab-friends-add"
          onClick={() => { setActiveTab('add'); setFeedback(null); }}
          style={{
            backgroundColor: activeTab === 'add' ? '#248046' : '#23a55a',
            color: '#ffffff',
            border: 'none',
            borderRadius: '4px',
            padding: '4px 10px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold'
          }}
        >
          Adicionar Amigo
        </button>
      </header>

      {/* Conteúdo da Aba */}
      <div style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
        {activeTab === 'all' && (
          <div>
            <h3 style={{ fontSize: '12px', color: '#949ba4', textTransform: 'uppercase', marginBottom: '12px' }}>
              Todos os Amigos — {acceptedFriends.length}
            </h3>
            {acceptedFriends.length === 0 ? (
              <div style={{ color: '#949ba4', textAlign: 'center', marginTop: '40px' }}>
                Nenhum amigo adicionado ainda. Use a aba "Adicionar Amigo" para começar!
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {acceptedFriends.map((f) => {
                  const presence = presenceService ? presenceService.getPresence(f.friendId) : 'offline';
                  return (
                    <div
                      key={f.friendId}
                      data-testid={`friend-row-${f.friendId}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        backgroundColor: '#2b2d31',
                        borderRadius: '6px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '18px',
                            backgroundColor: '#5865f2',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 'bold',
                            color: '#ffffff',
                            position: 'relative'
                          }}
                        >
                          {f.displayName.substring(0, 2).toUpperCase()}
                          <div
                            title={presence}
                            style={{
                              position: 'absolute',
                              bottom: '-2px',
                              right: '-2px',
                              width: '10px',
                              height: '10px',
                              borderRadius: '5px',
                              backgroundColor: presence === 'online' ? '#23a55a' : presence === 'idle' ? '#f0b232' : '#80848e',
                              border: '2px solid #2b2d31'
                            }}
                          />
                        </div>
                        <div>
                          <div style={{ fontWeight: 'bold', color: '#f2f3f5', fontSize: '14px' }}>
                            {f.displayName}
                          </div>
                          <div style={{ fontSize: '12px', color: '#949ba4' }}>
                            {presence === 'online' ? 'Online' : presence === 'idle' ? 'Ausente' : 'Offline'}
                          </div>
                        </div>
                      </div>

                      <button
                        data-testid={`btn-open-dm-${f.friendId}`}
                        onClick={() => onOpenDm(f.friendId)}
                        style={{
                          backgroundColor: '#383a40',
                          color: '#f2f3f5',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '6px 12px',
                          fontSize: '13px',
                          cursor: 'pointer'
                        }}
                      >
                        Mensagem Direta
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'pending' && (
          <div>
            <h3 style={{ fontSize: '12px', color: '#949ba4', textTransform: 'uppercase', marginBottom: '12px' }}>
              Pedidos Pendentes — {pendingFriends.length}
            </h3>
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
                      padding: '10px 12px',
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

        {activeTab === 'add' && (
          <div style={{ maxWidth: '500px' }}>
            <h3 style={{ fontSize: '15px', color: '#f2f3f5', marginBottom: '6px' }}>
              Adicionar Amigo
            </h3>
            <p style={{ fontSize: '13px', color: '#949ba4', marginBottom: '16px' }}>
              Você pode adicionar amigos inserindo o identificador de usuário deles.
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
                  padding: '0 16px',
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
      </div>
    </div>
  );
};
