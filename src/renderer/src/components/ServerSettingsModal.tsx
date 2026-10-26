import React, { useEffect, useRef, useState } from 'react';
import type { GuildService } from '../../../common/guild-types';
import type { GuildMember, Role, User } from '../../../common/types';
import { hasPermission, PermissionFlags } from '../../../common/permissions';

interface Props {
  guildId: string;
  user: User;
  service: GuildService;
  onClose: () => void;
  onChannelsChanged: (selectedId?: string) => Promise<void>;
  userDirectory?: () => Promise<User[]>;
}

const permissions = [
  ['Ver canais', PermissionFlags.VIEW_CHANNEL],
  ['Enviar mensagens', PermissionFlags.SEND_MESSAGES],
  ['Conectar na voz', PermissionFlags.CONNECT],
  ['Falar na voz', PermissionFlags.SPEAK],
  ['Gerenciar canais', PermissionFlags.MANAGE_CHANNELS],
  ['Gerenciar mensagens', PermissionFlags.MANAGE_MESSAGES],
  ['Gerenciar cargos', PermissionFlags.MANAGE_ROLES],
  ['Administrador', PermissionFlags.ADMINISTRATOR],
] as const;
const field: React.CSSProperties = { padding: 9, background: '#1e1f22', color: '#f2f3f5', border: '1px solid #80848e', borderRadius: 4, maxWidth: '100%' };
const button: React.CSSProperties = { padding: '8px 12px', background: '#5865f2', color: 'white', border: 0, borderRadius: 4, cursor: 'pointer' };

export function ServerSettingsModal({ guildId, user, service, onClose, onChannelsChanged, userDirectory }: Props) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [members, setMembers] = useState<GuildMember[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [allowed, setAllowed] = useState(0n);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [channelName, setChannelName] = useState('');
  const [channelType, setChannelType] = useState<'text' | 'voice'>('text');
  const [roleName, setRoleName] = useState('');
  const [roleColor, setRoleColor] = useState('#5865f2');
  const [rolePosition, setRolePosition] = useState(1);
  const [rolePermissions, setRolePermissions] = useState(PermissionFlags.VIEW_CHANNEL);
  const [memberId, setMemberId] = useState('');
  const [roleId, setRoleId] = useState('');
  const alive = useRef(true);
  const dialog = useRef<HTMLDivElement>(null);

  const load = async () => {
    const [nextRoles, nextMembers, nextAllowed, nextUsers] = await Promise.all([
      service.getGuildRoles?.(guildId) ?? Promise.resolve([]),
      service.getGuildMembers(guildId),
      service.getMemberPermissions?.(guildId, user.id) ?? Promise.resolve(0n),
      userDirectory?.() ?? Promise.resolve([]),
    ]);
    if (!alive.current) return;
    setRoles(nextRoles); setMembers(nextMembers); setAllowed(nextAllowed); setUsers(nextUsers);
    setMemberId(current => current || nextMembers[0]?.userId || '');
    setRoleId(current => current || nextRoles.find(role => role.id !== guildId)?.id || '');
  };

  useEffect(() => {
    alive.current = true;
    const priorFocus = document.activeElement as HTMLElement | null;
    dialog.current?.focus();
    void load().catch(err => { if (alive.current) setError(err instanceof Error ? err.message : 'Não foi possível carregar o servidor.'); })
      .finally(() => { if (alive.current) setLoading(false); });
    return () => { alive.current = false; priorFocus?.focus(); };
  }, [guildId, user.id, service]);

  const run = async (action: () => Promise<void>) => {
    if (busy) return;
    setBusy(true); setError(null); setFeedback(null);
    try { await action(); }
    catch (err) { if (alive.current) setError(err instanceof Error ? err.message : 'Não foi possível salvar.'); }
    finally { if (alive.current) setBusy(false); }
  };
  const canChannels = hasPermission(allowed, PermissionFlags.MANAGE_CHANNELS);
  const canRoles = hasPermission(allowed, PermissionFlags.MANAGE_ROLES);
  const nameOf = (id: string) => users.find(person => person.id === id)?.displayName ?? id;

  return <div style={{ position: 'fixed', inset: 0, background: '#000b', zIndex: 1000, display: 'grid', placeItems: 'center', padding: 12 }}>
    <div ref={dialog} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="server-settings-title"
      onKeyDown={event => {
        if (event.key === 'Escape' && !busy) onClose();
        if (event.key !== 'Tab') return;
        const items = dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex="0"]');
        if (!items?.length) { event.preventDefault(); return; }
        const first = items[0], last = items[items.length - 1];
        if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }}
      style={{ width: 'min(720px, 100%)', maxHeight: '90vh', overflowY: 'auto', background: '#313338', color: '#f2f3f5', padding: 24, borderRadius: 8, boxSizing: 'border-box' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}><h2 id="server-settings-title">Configurações do servidor</h2><button style={button} disabled={busy} onClick={onClose} aria-label="Fechar configurações do servidor">Fechar</button></header>
      {loading && <p role="status">Carregando servidor…</p>}
      {error && <p role="alert" style={{ color: '#ffb3ba' }}>{error}</p>}
      {feedback && <p role="status">{feedback}</p>}
      {!loading && <>
        <section><h3>Canais de texto e voz</h3>
          {canChannels ? <form onSubmit={event => { event.preventDefault(); void run(async () => {
            const created = await service.createChannel({ guildId, actorId: user.id, name: channelName.trim(), type: channelType });
            await onChannelsChanged(created.id);
            if (alive.current) { setChannelName(''); setFeedback('Canal criado.'); }
          }); }} style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'end' }}>
            <label>Nome do canal<input style={{ ...field, display: 'block' }} aria-label="Nome do canal" value={channelName} maxLength={100} required disabled={busy} onChange={e => setChannelName(e.target.value)} /></label>
            <label>Tipo de canal<select style={{ ...field, display: 'block' }} aria-label="Tipo de canal" value={channelType} disabled={busy} onChange={e => setChannelType(e.target.value as 'text' | 'voice')}><option value="text">Texto</option><option value="voice">Voz</option></select></label>
            <button style={button} disabled={busy || !channelName.trim()}>Criar canal</button>
          </form> : <p>Você não tem permissão para gerenciar canais.</p>}
        </section>
        <section><h3>Cargos do servidor</h3>
          <ul>{roles.map(role => <li key={role.id}><span style={{ color: role.color || '#f2f3f5' }}>{role.name}</span> · posição {role.position}</li>)}</ul>
          {canRoles ? <>
            <form onSubmit={event => { event.preventDefault(); void run(async () => {
              await service.createRole({ guildId, actorId: user.id, name: roleName.trim(), color: roleColor, position: rolePosition, permissions: rolePermissions });
              await load();
              if (alive.current) { setRoleName(''); setFeedback('Cargo criado.'); }
            }); }} style={{ display: 'grid', gap: 12 }}>
              <label>Nome do cargo<input style={{ ...field, display: 'block' }} aria-label="Nome do cargo" value={roleName} required maxLength={100} disabled={busy} onChange={e => setRoleName(e.target.value)} /></label>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}><label>Cor<input style={{ ...field, display: 'block' }} type="color" aria-label="Cor do cargo" value={roleColor} disabled={busy} onChange={e => setRoleColor(e.target.value)} /></label>
              <label>Posição na hierarquia<input style={{ ...field, display: 'block', width: 90 }} type="number" aria-label="Posição do cargo" min={1} max={999} value={rolePosition} disabled={busy} required onChange={e => setRolePosition(Number(e.target.value))} /></label></div>
              <fieldset disabled={busy}><legend>Permissões do cargo</legend><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 8 }}>{permissions.map(([label, flag]) => <label key={label}><input type="checkbox" checked={(rolePermissions & flag) !== 0n} disabled={!hasPermission(allowed, flag)} onChange={e => setRolePermissions(current => e.target.checked ? current | flag : current & ~flag)} /> {label}</label>)}</div></fieldset>
              <button style={{ ...button, justifySelf: 'start' }} disabled={busy || !roleName.trim()}>Criar cargo</button>
            </form>
            <h4>Atribuir ou remover cargo</h4>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'end' }}>
              <label>Membro<select style={{ ...field, display: 'block' }} aria-label="Membro" value={memberId} disabled={busy} onChange={e => setMemberId(e.target.value)}>{members.map(member => <option key={member.userId} value={member.userId}>{nameOf(member.userId)}</option>)}</select></label>
              <label>Cargo<select style={{ ...field, display: 'block' }} aria-label="Cargo para atribuição" value={roleId} disabled={busy} onChange={e => setRoleId(e.target.value)}><option value="">Selecione</option>{roles.filter(role => role.id !== guildId).map(role => <option key={role.id} value={role.id}>{role.name}</option>)}</select></label>
              <button style={button} disabled={busy || !roleId || !memberId} onClick={() => void run(async () => { await service.assignRole({ guildId, actorId: user.id, targetUserId: memberId, roleId }); await load(); if (alive.current) setFeedback('Cargo atribuído.'); })}>Atribuir cargo</button>
              <button style={button} disabled={busy || !roleId || !memberId} onClick={() => void run(async () => { await service.removeRole({ guildId, actorId: user.id, targetUserId: memberId, roleId }); await load(); if (alive.current) setFeedback('Cargo removido.'); })}>Remover cargo</button>
            </div>
          </> : <p>Você não tem permissão para gerenciar cargos.</p>}
        </section>
        <section><h3>Membros</h3><ul>{members.map(member => <li key={member.userId}>{nameOf(member.userId)} · {member.roleIds.map(id => roles.find(role => role.id === id)?.name ?? id).join(', ')}</li>)}</ul></section>
      </>}
    </div>
  </div>;
}
