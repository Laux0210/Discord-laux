import { describe, it, expect } from 'vitest';
import {
  auditReleaseArtifacts,
  validateReleaseManifest,
  type ReleaseManifest
} from '../../src/common/release-types';

describe('Release and Installer Integrity Audit (RF-01, RF-15, RF-16)', () => {
  const validManifest: ReleaseManifest = {
    productName: 'Discord Desktop',
    appId: 'com.discord.desktop',
    version: '0.1.0',
    platform: 'win32',
    arch: 'x64',
    language: 'pt-BR',
    targetOS: ['Windows 10', 'Windows 11'],
    installMode: 'per-user',
    installDirectory: '%LOCALAPPDATA%\\Programs\\discord-desktop',
    executable: 'discord-desktop.exe',
    security: {
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      cspEnforced: true,
      secretsLeaked: false
    },
    boundaries: {
      webcamSupported: false,
      recordingSupported: false,
      dmVoiceSupported: false
    },
    files: [
      {
        path: 'dist-electron/main/index.js',
        sha256: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
        size: 5000
      },
      {
        path: 'dist-electron/preload/index.cjs',
        sha256: 'b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3',
        size: 2000
      },
      {
        path: 'dist/index.html',
        sha256: 'c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4',
        size: 700
      }
    ]
  };

  it('valida os metadados canônicos do manifesto de release para Windows 10/11 x64', () => {
    const result = validateReleaseManifest(validManifest);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejeita manifesto com plataforma ou arquitetura diferente de win32 x64', () => {
    const invalidManifest = {
      ...validManifest,
      platform: 'linux' as any,
      arch: 'arm64' as any
    };
    const result = validateReleaseManifest(invalidManifest);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('plataforma') || e.includes('arquitetura'))).toBe(
      true
    );
  });

  it('rejeita manifesto com violação das fronteiras estritas do MVP (RF-16)', () => {
    const violatingManifest: ReleaseManifest = {
      ...validManifest,
      boundaries: {
        webcamSupported: true, // Violação de RF-16
        recordingSupported: false,
        dmVoiceSupported: false
      }
    };
    const result = validateReleaseManifest(violatingManifest);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('RF-16') || e.includes('webcam'))).toBe(true);
  });

  it('rejeita manifesto que não contenha os artefatos mínimos obrigatórios (main, preload, dist/index.html)', () => {
    const incompleteManifest: ReleaseManifest = {
      ...validManifest,
      files: [{ path: 'dist/index.html', sha256: 'abc', size: 100 }]
    };
    const result = validateReleaseManifest(incompleteManifest);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('obrigatório') || e.includes('main'))).toBe(true);
  });

  it('audita conteúdo de arquivos e detecta vazamento de credenciais privadas ou segredos', () => {
    const mockFiles: Record<string, string> = {
      'dist-electron/main/index.js': 'console.log("App iniciado");',
      'dist/assets/index.js': 'export const API_URL = "https://mock.local";'
    };

    const cleanResult = auditReleaseArtifacts(mockFiles);
    expect(cleanResult.hasSecrets).toBe(false);
    expect(cleanResult.detectedViolations).toHaveLength(0);

    const contaminatedFiles: Record<string, string> = {
      'dist-electron/main/index.js': 'const SUPABASE_SERVICE_ROLE_KEY = "eyJhGciOi...";',
      'dist/assets/index.js': 'const PRIVATE_KEY = "-----BEGIN PRIVATE KEY-----";'
    };

    const dirtyResult = auditReleaseArtifacts(contaminatedFiles);
    expect(dirtyResult.hasSecrets).toBe(true);
    expect(dirtyResult.detectedViolations.length).toBeGreaterThanOrEqual(2);
  });
});
