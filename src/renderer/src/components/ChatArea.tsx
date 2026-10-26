import React, { useState, useRef, useEffect } from 'react';
import type { Message, Channel } from '../../../common/types';

export interface ChatAreaProps {
  channel: Channel;
  messages: Message[];
  currentUserId?: string;
  onSendMessage: (content: string) => void | Promise<void>;
  onDeleteMessage?: (messageId: string) => void;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  channel,
  messages,
  currentUserId,
  onSendMessage,
  onDeleteMessage
}) => {
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const pending = useRef(false);
  const context = useRef(0);
  useEffect(() => {
    context.current++;
    setInputText(''); setSendError(null); setIsSending(false); pending.current = false;
    return () => { context.current++; };
  }, [channel.id, currentUserId]);

  const send = async () => {
    const draft = inputText.trim();
    if (!draft || pending.current) return;
    const generation = context.current;
    pending.current = true; setIsSending(true); setSendError(null);
    try {
      await onSendMessage(draft);
      if (context.current === generation) setInputText('');
    } catch (error) {
      if (context.current === generation) setSendError(error instanceof Error ? error.message : 'Não foi possível enviar. Tente novamente.');
    } finally {
      if (context.current === generation) { pending.current = false; setIsSending(false); }
    }
  };
  const handleSubmit = (event: React.FormEvent) => { event.preventDefault(); void send(); };
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void send(); }
  };

  return (
    <main
      data-testid="chat-area"
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#313338'
      }}
    >
      {/* Header do Canal */}
      <header
        style={{
          height: '48px',
          borderBottom: '1px solid #202225',
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          gap: '8px'
        }}
      >
        <span style={{ color: '#80848e', fontSize: '20px' }}>
          {channel.type === 'voice' ? '🔊' : '#'}
        </span>
        <span style={{ fontWeight: 'bold', color: '#f2f3f5' }}>{channel.name}</span>
        {channel.topic && (
          <span style={{ color: '#949ba4', fontSize: '13px', marginLeft: '12px' }}>
            {channel.topic}
          </span>
        )}
      </header>

      {/* Lista de Mensagens */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}
      >
        {messages.length === 0 ? (
          <div style={{ color: '#949ba4', textAlign: 'center', marginTop: '32px' }}>
            Nenhuma mensagem nos últimos 10 dias neste canal. Comece a conversa!
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                gap: '12px',
                padding: '4px 8px',
                borderRadius: '4px'
              }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '20px',
                  backgroundColor: '#5865f2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  fontWeight: 'bold',
                  fontSize: '14px',
                  flexShrink: 0
                }}
              >
                {msg.authorName.substring(0, 2).toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  <span style={{ fontWeight: 'bold', color: '#f2f3f5', fontSize: '14px' }}>
                    {msg.authorName}
                  </span>
                  <span style={{ color: '#949ba4', fontSize: '11px' }}>
                    {new Date(msg.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                  {currentUserId === msg.authorId && onDeleteMessage && (
                    <button
                      onClick={() => onDeleteMessage(msg.id)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#da373c',
                        cursor: 'pointer',
                        fontSize: '11px',
                        marginLeft: 'auto'
                      }}
                    >
                      Excluir
                    </button>
                  )}
                </div>
                <div style={{ color: '#dbdee1', fontSize: '14px', marginTop: '2px' }}>
                  {msg.content}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Caixa de Entrada de Texto com envio ao pressionar Enter */}
      <footer style={{ padding: '0 16px 20px 16px' }}>
        {sendError && <p role="alert" style={{ color: '#ffb3ba' }}>{sendError}</p>}
        {isSending && <p role="status">Salvando mensagem…</p>}
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={inputText}
            aria-label={`Mensagem em ${channel.name}`}
            disabled={isSending}
            maxLength={2000}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Conversar em #${channel.name}`}
            style={{
              width: '100%',
              backgroundColor: '#383a40',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 16px',
              color: '#dbdee1',
              fontSize: '14px',
              outline: 'none'
            }}
          />
        </form>
      </footer>
    </main>
  );
};
