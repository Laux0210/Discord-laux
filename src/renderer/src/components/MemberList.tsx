import React, { useEffect, useState } from 'react';
import type { GuildMemberPresence, MemberDirectory } from '../../../common/text-types';

export interface MemberListProps {
  guildId: string;
  directory: MemberDirectory;
}

const REFRESH_MS = 15_000;
const HEARTBEAT_MS = 30_000;

/** Lista lateral de membros do servidor, separada em online e offline. */
export const MemberList: React.FC<MemberListProps> = ({ guildId, directory }) => {
  const [members, setMembers] = useState<GuildMemberPresence[]>([]);

  useEffect(() => {
    let stopped = false;
    const refresh = async () => {
      try {
        const list = await directory.listMembers(guildId);
        if (!stopped) setMembers(list);
      } catch (err) {
        console.warn('Falha ao carregar membros:', err);
      }
    };
    const beat = () => directory.heartbeat().catch((err) => console.warn('Falha no heartbeat de presença:', err));
    void beat().then(refresh);
    const refreshTimer = setInterval(() => void refresh(), REFRESH_MS);
    const beatTimer = setInterval(() => void beat(), HEARTBEAT_MS);
    return () => {
      stopped = true;
      clearInterval(refreshTimer);
      clearInterval(beatTimer);
    };
  }, [guildId, directory]);

  const byName = (a: GuildMemberPresence, b: GuildMemberPresence) => a.displayName.localeCompare(b.displayName);
  const online = members.filter((m) => m.online).sort(byName);
  const offline = members.filter((m) => !m.online).sort(byName);

  const section = (title: string, list: GuildMemberPresence[], isOnline: boolean) => (
    <div style={{ marginBottom: 16 }}>
      <h3 style={{ fontSize: 12, fontWeight: 'bold', color: '#949ba4', textTransform: 'uppercase', margin: '0 0 6px 8px' }}>
        {title} — {list.length}
      </h3>
      {list.map((m) => (
        <div
          key={m.userId}
          data-testid={`member-${m.userId}`}
          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px', borderRadius: 4, opacity: isOnline ? 1 : 0.4 }}
        >
          <div style={{ position: 'relative', width: 32, height: 32, flexShrink: 0 }}>
            {m.avatarUrl ? (
              <img src={m.avatarUrl} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: '#5865f2', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: 14 }}>
                {m.displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <span
              aria-label={isOnline ? 'online' : 'offline'}
              style={{ position: 'absolute', right: -2, bottom: -2, width: 12, height: 12, borderRadius: '50%', border: '3px solid #2b2d31', backgroundColor: isOnline ? '#23a55a' : '#80848e' }}
            />
          </div>
          <span style={{ color: isOnline ? '#f2f3f5' : '#949ba4', fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {m.displayName}
          </span>
        </div>
      ))}
    </div>
  );

  return (
    <aside
      data-testid="member-list"
      aria-label="Membros do servidor"
      style={{ width: 240, flexShrink: 0, backgroundColor: '#2b2d31', padding: '16px 8px', overflowY: 'auto' }}
    >
      {section('Online', online, true)}
      {offline.length > 0 && section('Offline', offline, false)}
    </aside>
  );
};
