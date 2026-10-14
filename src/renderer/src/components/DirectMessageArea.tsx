import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { DmMessage, FriendshipService } from '../../../common/text-types';
import type { User } from '../../../common/types';

export interface DirectMessageAreaProps {
  service: FriendshipService;
  user: User;
  friendId: string;
  friendName: string;
  onBack: () => void;
}

interface ConversationScope {
  service: FriendshipService;
  userId: string;
  friendId: string;
}

interface ConversationView {
  scope: ConversationScope;
  phase: 'loading' | 'ready' | 'error';
  messages: DmMessage[];
  error: string | null;
}

interface ConversationRuntime {
  scope: ConversationScope;
  active: boolean;
  ready: boolean;
  sending: boolean;
  channelId: string | null;
  version: number;
  retry: { content: string; nonce: string } | null;
  reload: () => Promise<void>;
  open: () => Promise<void>;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'O serviço local não conseguiu concluir a operação.';
}

export function DirectMessageArea({ service, user, friendId, friendName, onBack }: DirectMessageAreaProps) {
  const scope = useMemo(() => ({ service, userId: user.id, friendId }), [service, user.id, friendId]);
  const [state, setState] = useState<ConversationView>({ scope, phase: 'loading', messages: [], error: null });
  const [draft, setDraft] = useState({ scope, content: '' });
  const [sending, setSending] = useState({ scope, value: false });
  const runtimeRef = useRef<ConversationRuntime | null>(null);
  const inputId = useId();
  // A identidade participa do render, não apenas do cleanup assíncrono.
  const view = state.scope === scope ? state : { scope, phase: 'loading', messages: [], error: null };
  const content = draft.scope === scope ? draft.content : '';
  const isSending = sending.scope === scope && sending.value;

  useEffect(() => {
    let unsubscribe = () => {};
    const runtime: ConversationRuntime = {
      scope, active: true, ready: false, sending: false, channelId: null, version: 0, retry: null,
      reload: async () => {}, open: async () => {}
    };
    runtimeRef.current = runtime;
    setDraft({ scope, content: '' });
    setSending({ scope, value: false });

    const fail = (error: unknown) => {
      runtime.ready = false;
      setState({ scope, phase: 'error', messages: [], error: errorMessage(error) });
    };

    runtime.reload = async () => {
      if (!runtime.active || !runtime.channelId) return;
      const version = ++runtime.version;
      runtime.ready = false;
      setState({ scope, phase: 'loading', messages: [], error: null });
      try {
        const messages = await service.getDmMessages(runtime.channelId, user.id);
        if (!runtime.active || version !== runtime.version) return;
        runtime.ready = true;
        setState({ scope, phase: 'ready', messages, error: null });
      } catch (error) {
        if (runtime.active && version === runtime.version) fail(error);
      }
    };

    runtime.open = async () => {
      if (!runtime.active) return;
      const version = ++runtime.version;
      runtime.ready = false;
      unsubscribe();
      unsubscribe = () => {};
      setState({ scope, phase: 'loading', messages: [], error: null });
      try {
        const channel = await service.getOrCreateDmChannel(user.id, friendId);
        if (!runtime.active || version !== runtime.version) return;
        runtime.channelId = channel.id;
        // O evento não transporta texto; o serviço revalida toda leitura.
        unsubscribe = service.onDmUpdated?.(channel.id, user.id, () => { void runtime.reload(); }) ?? (() => {});
        await runtime.reload();
      } catch (error) {
        if (runtime.active && version === runtime.version) fail(error);
      }
    };

    void runtime.open();
    return () => {
      runtime.active = false;
      runtime.version++;
      unsubscribe();
      if (runtimeRef.current === runtime) runtimeRef.current = null;
    };
  }, [scope]);

  const handleSend = async (event: React.FormEvent) => {
    event.preventDefault();
    const runtime = runtimeRef.current;
    if (!runtime || runtime.scope !== scope || !runtime.active || !runtime.ready || runtime.sending || !runtime.channelId || !content.trim()) return;
    runtime.sending = true;
    setSending({ scope, value: true });
    if (runtime.retry?.content !== content) runtime.retry = { content, nonce: crypto.randomUUID() };
    try {
      await service.sendDmMessage({
        dmChannelId: runtime.channelId, authorId: user.id, authorName: user.displayName,
        content, nonce: runtime.retry.nonce
      });
      if (!runtime.active) return;
      runtime.retry = null;
      setDraft((previous) => previous.scope === scope && previous.content === content ? { scope, content: '' } : previous);
      await runtime.reload();
    } catch (error) {
      if (!runtime.active) return;
      const message = errorMessage(error);
      const accessDenied = /ACESSO_NEGADO_DM|BLOQUEIO_ATIVO|AMIZADE_NECESSARIA_PARA_DM|DM_NAO_ENCONTRADA/.test(message);
      if (accessDenied) {
        runtime.version++;
        runtime.ready = false;
        setState({ scope, phase: 'error', messages: [], error: message });
      } else {
        setState((previous) => previous.scope === scope ? { ...previous, error: message } : previous);
      }
    } finally {
      runtime.sending = false;
      if (runtime.active) setSending({ scope, value: false });
    }
  };

  return (
    <section data-testid="direct-message-area" aria-label={`Conversa direta com ${friendName}`} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', backgroundColor: '#313338', color: '#dbdee1' }}>
      <header style={{ padding: '12px 16px', borderBottom: '1px solid #202225', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <button type="button" onClick={onBack}>Voltar para Amigos</button>
        <h2 style={{ fontSize: '16px', flex: 1 }}>Conversa com {friendName}</h2>
        <button type="button" disabled={isSending || view.phase === 'loading'} onClick={() => { void runtimeRef.current?.open(); }}>Atualizar</button>
      </header>
      <p style={{ padding: '8px 16px', color: '#949ba4', fontSize: '12px' }}>Ambiente local fictício. Mensagens em memória, disponíveis por até 10 dias.</p>
      {view.error && <p role="alert" style={{ padding: '12px 16px', color: '#f23f43' }}>Não foi possível concluir a operação: {view.error}</p>}
      <div aria-live="polite" style={{ flex: 1, overflowY: 'auto', padding: '16px', userSelect: 'text' }}>
        {view.phase === 'loading' && <p role="status">Carregando conversa…</p>}
        {view.phase === 'ready' && view.messages.length === 0 && <p>Nenhuma mensagem nos últimos 10 dias. Comece a conversa.</p>}
        <ol aria-label="Mensagens diretas" style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {view.messages.map((message) => <li key={message.id} style={{ overflowWrap: 'anywhere', whiteSpace: 'pre-wrap' }}><strong>{message.authorName}: </strong>{message.content}</li>)}
        </ol>
      </div>
      <form onSubmit={handleSend} style={{ padding: '12px 16px', display: 'flex', flexWrap: 'wrap', alignItems: 'end', gap: '8px' }}>
        <label htmlFor={inputId} style={{ flex: '1 1 100%' }}>Mensagem direta para {friendName}</label>
        <textarea
          id={inputId}
          value={content}
          onChange={(event) => setDraft({ scope, content: event.target.value })}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              if (content.trim() && view.phase === 'ready' && !isSending) {
                event.currentTarget.form?.requestSubmit();
              }
            }
          }}
          maxLength={2000}
          disabled={view.phase !== 'ready' || isSending}
          rows={2}
          placeholder="Pressione Enter para enviar, Shift+Enter para nova linha"
          style={{ flex: '1 1 240px', minWidth: 0, padding: '10px', backgroundColor: '#383a40', color: '#dbdee1', borderRadius: '6px' }}
        />
        <button type="submit" disabled={view.phase !== 'ready' || isSending || !content.trim()}>{isSending ? 'Enviando…' : 'Enviar'}</button>
      </form>
    </section>
  );
}
