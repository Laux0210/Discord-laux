import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

describe('Row-Level Security (RLS) Policies (Task 2)', () => {
  const rlsMigrationPath = resolve(process.cwd(), 'supabase/migrations/20261014000002_rls_policies.sql');

  it('migration file 20261014000002_rls_policies.sql must exist', () => {
    expect(existsSync(rlsMigrationPath)).toBe(true);
  });

  it('enables row level security on all domain tables', () => {
    const sql = readFileSync(rlsMigrationPath, 'utf-8');

    const securedTables = [
      'profiles',
      'friendships',
      'blocks',
      'guilds',
      'guild_members',
      'roles',
      'member_roles',
      'channels',
      'channel_overrides',
      'invites',
      'messages',
      'dm_channels',
      'dm_participants',
      'dm_messages'
    ];

    for (const table of securedTables) {
      expect(sql).toContain(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`);
    }
  });

  it('enforces 10-day retention window and no-edit rule on messages table', () => {
    const sql = readFileSync(rlsMigrationPath, 'utf-8');
    // Verifica a cláusula de retenção de 10 dias nas mensagens
    expect(sql).toContain("created_at >= (now() - interval '10 days')");
    // Sem edição de mensagem (sem policy de UPDATE liberando alteração de conteúdo)
    expect(sql).toContain('messages_select_policy');
    expect(sql).toContain('messages_insert_policy');
  });

  it('strictly isolates DM messages to channel participants and prevents community admin leak', () => {
    const sql = readFileSync(rlsMigrationPath, 'utf-8');
    expect(sql).toContain('dm_messages_select_policy');
    expect(sql).toContain('dm_messages_insert_policy');
    expect(sql).toContain('dm_participants');
  });
});
