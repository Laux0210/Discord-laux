import { existsSync, mkdirSync, openSync, closeSync, fsyncSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { join, resolve } from 'node:path';
import type { User } from '../common/types';
import type { StorageAdapter } from '../renderer/src/services/storage-service';
import { purgeExpiredMessageSnapshots } from './retention';

export interface ServerAccount {
  email: string;
  user: User;
  salt: string;
  passwordHash: string;
}

export interface ServerState {
  version: 1;
  ownerId: string | null;
  accounts: Record<string, ServerAccount>;
  sessions: Record<string, { userId: string; expiresAt: number }>;
  data: Record<string, string>;
}

function emptyState(): ServerState {
  return { version: 1, ownerId: null, accounts: {}, sessions: {}, data: {} };
}

/** One process owns the file; successful operations replace it atomically. */
export class SharedStore {
  private state: ServerState;
  private queue: Promise<unknown> = Promise.resolve();
  private lockPath: string;
  private lockToken = randomUUID();
  private closed = false;
  readonly path: string;

  constructor(directory: string) {
    const absoluteDirectory = resolve(directory);
    mkdirSync(absoluteDirectory, { recursive: true, mode: 0o700 });
    this.path = join(absoluteDirectory, 'shared-state.json');
    this.lockPath = join(absoluteDirectory, 'shared-state.lock');
    let descriptor: number;
    try { descriptor = openSync(this.lockPath, 'wx', 0o600); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'EEXIST') throw new Error('Já existe uma instância usando esta pasta de dados. Se houve encerramento inesperado, confirme que o processo anterior terminou antes de remover shared-state.lock.');
      throw error;
    }
    try {
      writeFileSync(descriptor, JSON.stringify({ pid: process.pid, token: this.lockToken }));
    } finally { closeSync(descriptor); }
    this.state = emptyState();
    try {
      if (!existsSync(this.path)) return;
      const parsed: unknown = JSON.parse(readFileSync(this.path, 'utf8'));
      if (!parsed || typeof parsed !== 'object' || (parsed as ServerState).version !== 1 ||
        !isRecord((parsed as ServerState).accounts) || !isRecord((parsed as ServerState).sessions) || !isRecord((parsed as ServerState).data)) {
        throw new Error('Arquivo de dados compartilhados inválido; preserve o arquivo para recuperação.');
      }
      const draft = parsed as ServerState;
      if (purgeExpiredMessageSnapshots(draft.data)) this.writeState(JSON.stringify(draft));
      this.state = draft;
    } catch (error) {
      this.close();
      throw error;
    }
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    if (existsSync(this.lockPath)) {
      const lock = JSON.parse(readFileSync(this.lockPath, 'utf8'));
      if (lock.token === this.lockToken) unlinkSync(this.lockPath);
    }
  }

  private writeState(serialized: string): void {
    const temporary = this.path + '.tmp';
    writeFileSync(temporary, serialized, { encoding: 'utf8', mode: 0o600 });
    const descriptor = openSync(temporary, 'r+');
    try { fsyncSync(descriptor); } finally { closeSync(descriptor); }
    renameSync(temporary, this.path);
  }

  async transaction<T>(operation: (draft: ServerState, adapter: StorageAdapter) => Promise<T> | T): Promise<T> {
    const current = this.queue.then(async () => {
      if (this.closed) throw new Error('Servidor encerrado.');
      const draft = structuredClone(this.state);
      const before = JSON.stringify(draft);
      purgeExpiredMessageSnapshots(draft.data);
      const adapter: StorageAdapter = {
        getItem: key => Object.hasOwn(draft.data, key) ? draft.data[key] : null,
        setItem: (key, value) => { Object.defineProperty(draft.data, key, { value, writable: true, enumerable: true, configurable: true }); },
        removeItem: key => { delete draft.data[key]; },
      };
      const result = await operation(draft, adapter);
      const serialized = JSON.stringify(draft);
      if (serialized !== before) {
        this.writeState(serialized);
        this.state = draft;
      }
      return result;
    });
    this.queue = current.catch(() => undefined);
    return current;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
