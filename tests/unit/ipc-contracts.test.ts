import { describe, it, expect } from 'vitest';
import {
  IPC_CHANNELS,
  isValidChannel,
  validateIpcPayload
} from '../../src/common/ipc-channels';

describe('IPC Contracts & Security Validation', () => {
  it('validates recognized safe IPC channels', () => {
    expect(isValidChannel(IPC_CHANNELS.GET_APP_VERSION)).toBe(true);
    expect(isValidChannel(IPC_CHANNELS.GET_DESKTOP_SOURCES)).toBe(true);
    expect(isValidChannel(IPC_CHANNELS.OPEN_EXTERNAL_URL)).toBe(true);
  });

  it('rejects arbitrary, malicious or unregistered IPC channels', () => {
    expect(isValidChannel('node:fs:readFile')).toBe(false);
    expect(isValidChannel('electron:remote:require')).toBe(false);
    expect(isValidChannel('')).toBe(false);
    expect(isValidChannel('undefined')).toBe(false);
  });

  it('validates OPEN_EXTERNAL_URL payloads ensuring only safe http/https URLs are permitted', () => {
    const validHttp = { url: 'https://example.com' };
    const validHttps = { url: 'http://localhost:5173' };
    const maliciousScript = { url: 'javascript:alert(1)' };
    const maliciousFile = { url: 'file:///C:/Windows/System32/cmd.exe' };
    const malformed = { notAUrl: 123 };

    expect(validateIpcPayload(IPC_CHANNELS.OPEN_EXTERNAL_URL, validHttp)).toBe(true);
    expect(validateIpcPayload(IPC_CHANNELS.OPEN_EXTERNAL_URL, validHttps)).toBe(true);
    expect(validateIpcPayload(IPC_CHANNELS.OPEN_EXTERNAL_URL, maliciousScript)).toBe(false);
    expect(validateIpcPayload(IPC_CHANNELS.OPEN_EXTERNAL_URL, maliciousFile)).toBe(false);
    expect(validateIpcPayload(IPC_CHANNELS.OPEN_EXTERNAL_URL, malformed)).toBe(false);
  });

  it('validates GET_DESKTOP_SOURCES payload parameters', () => {
    const validOpts = { types: ['screen', 'window'], thumbnailSize: { width: 150, height: 150 } };
    const invalidOpts = { types: ['arbitrary'] };

    expect(validateIpcPayload(IPC_CHANNELS.GET_DESKTOP_SOURCES, validOpts)).toBe(true);
    expect(validateIpcPayload(IPC_CHANNELS.GET_DESKTOP_SOURCES, undefined)).toBe(true); // Opcional
    expect(validateIpcPayload(IPC_CHANNELS.GET_DESKTOP_SOURCES, invalidOpts)).toBe(false);
  });
});
