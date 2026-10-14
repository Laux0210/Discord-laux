import { beforeAll, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { isTrustedIpcSender } from '../../src/main/ipc-security';

const root = resolve(import.meta.dirname, '../..');

describe('artefatos desktop executáveis', () => {
  beforeAll(() => {
    execFileSync(process.execPath, ['scripts/build-desktop.mjs'], { cwd: root, timeout: 20_000 });
  });

  it('gera a entrada declarada e um preload compatível com sandbox', () => {
    const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
    expect(existsSync(resolve(root, pkg.main))).toBe(true);
    const preload = resolve(root, 'dist-electron/preload/index.cjs');
    expect(existsSync(preload)).toBe(true);
    execFileSync(process.execPath, ['--check', resolve(root, pkg.main)], { cwd: root });
    execFileSync(process.execPath, ['--check', preload], { cwd: root });
    const requires = [...readFileSync(preload, 'utf8').matchAll(/require\(["']([^"']+)["']\)/g)];
    expect(requires.map((match) => match[1])).toEqual(['electron']);
  });
});

describe('origem dos IPC privilegiados', () => {
  const frame = { url: 'file:///app/dist/index.html' };
  const webContents = { mainFrame: frame };
  const target = { webContents, expectedURL: frame.url };

  it('aceita somente o frame principal do renderer local', () => {
    expect(isTrustedIpcSender({ sender: webContents, senderFrame: frame }, target)).toBe(true);
  });

  it('recusa outra janela mesmo com a mesma URL', () => {
    expect(isTrustedIpcSender({ sender: {}, senderFrame: frame }, target)).toBe(false);
  });

  it('recusa subframes, emissor ausente e documento navegado', () => {
    expect(isTrustedIpcSender({ sender: webContents, senderFrame: { ...frame } }, target)).toBe(false);
    expect(isTrustedIpcSender({ sender: webContents, senderFrame: null }, target)).toBe(false);
    expect(isTrustedIpcSender({ sender: webContents, senderFrame: frame }, { ...target, expectedURL: 'https://example.com' })).toBe(false);
  });
});
