import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

describe('Data Schema Migrations (Task 1)', () => {
  const migrationPath = resolve(process.cwd(), 'supabase/migrations/20261014000001_initial_schema.sql');

  it('migration file 20261014000001_initial_schema.sql must exist', () => {
    expect(existsSync(migrationPath)).toBe(true);
  });

  it('defines all required identity, community and messaging tables', () => {
    const sql = readFileSync(migrationPath, 'utf-8');

    const expectedTables = [
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

    for (const table of expectedTables) {
      expect(sql).toContain(`CREATE TABLE IF NOT EXISTS ${table}`);
    }
  });

  it('defines message constraints and performance retention index', () => {
    const sql = readFileSync(migrationPath, 'utf-8');
    expect(sql).toContain('idx_messages_retention');
    expect(sql).toContain('is_deleted');
    expect(sql).toContain('created_at');
  });
});
