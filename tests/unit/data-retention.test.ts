import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import {
  getRetentionCutoffTimestamp,
  isMessageExpired,
  generatePurgeSql,
  RETENTION_DAYS,
  RETENTION_MS
} from '../../src/data/retention';

describe('10-Day Retention & Purge Mechanism (Task 3)', () => {
  const purgeMigrationPath = resolve(process.cwd(), 'supabase/migrations/20261014000003_retention_purge.sql');

  it('migration file 20261014000003_retention_purge.sql must exist', () => {
    expect(existsSync(purgeMigrationPath)).toBe(true);
  });

  it('defines SQL function purge_expired_messages for physical deletion', () => {
    const sql = readFileSync(purgeMigrationPath, 'utf-8');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION purge_expired_messages');
    expect(sql).toContain("now() - interval '10 days'");
    expect(sql).toContain('DELETE FROM messages');
    expect(sql).toContain('WHERE created_at < cutoff_time');
    expect(sql).toContain('DELETE FROM dm_messages');
  });

  it('calculates exact 10-day cutoff timestamp (864,000,000 ms)', () => {
    expect(RETENTION_DAYS).toBe(10);
    expect(RETENTION_MS).toBe(10 * 24 * 60 * 60 * 1000);

    const base = new Date('2026-10-14T12:00:00Z');
    const cutoff = getRetentionCutoffTimestamp(base);
    expect(cutoff.toISOString()).toBe('2026-10-04T12:00:00.000Z');
  });

  it('determines whether message is expired based on strict cutoff', () => {
    const base = new Date('2026-10-14T12:00:00Z');

    // 9 dias atrás: NÃO expirada
    const nineDays = new Date(base.getTime() - 9 * 24 * 60 * 60 * 1000);
    expect(isMessageExpired(nineDays, base)).toBe(false);

    // 10 dias e 1 minuto atrás: EXPIRADA
    const tenDaysAndOneMin = new Date(base.getTime() - (10 * 24 * 60 * 60 * 1000 + 60 * 1000));
    expect(isMessageExpired(tenDaysAndOneMin, base)).toBe(true);
  });

  it('generates parameterized SQL delete query for cron / worker tasks', () => {
    const cutoff = new Date('2026-10-04T12:00:00Z');
    const query = generatePurgeSql(cutoff);
    expect(query).toContain('DELETE FROM messages WHERE created_at <');
    expect(query).toContain('DELETE FROM dm_messages WHERE created_at <');
    expect(query).toContain(cutoff.toISOString());
  });
});
