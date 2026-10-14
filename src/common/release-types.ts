/**
/**
 * Tipos e utilitários de auditoria de release e instalador (RF-01, RF-15, RF-16)
 */

export interface ReleaseFileEntry {
  path: string;
  sha256: string;
  size: number;
}

export interface ReleaseSecurityStatus {
  contextIsolation: boolean;
  sandbox: boolean;
  nodeIntegration: boolean;
  cspEnforced: boolean;
  secretsLeaked: boolean;
}

export interface ReleaseMvpBoundaries {
  webcamSupported: boolean;
  recordingSupported: boolean;
  dmVoiceSupported: boolean;
}

export interface ReleaseManifest {
  productName: string;
  appId: string;
  version: string;
  platform: 'win32';
  arch: 'x64';
  language: string;
  targetOS: string[];
  installMode: 'per-user' | 'all-users';
  installDirectory: string;
  executable: string;
  security: ReleaseSecurityStatus;
  boundaries: ReleaseMvpBoundaries;
  files: ReleaseFileEntry[];
}

export interface ManifestValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface SecurityAuditResult {
  hasSecrets: boolean;
  detectedViolations: string[];
}

const FORBIDDEN_SECRET_PATTERNS: { name: string; pattern: RegExp }[] = [
  { name: 'Private Key', pattern: /-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----/i },
  { name: 'Service Role Key', pattern: /SUPABASE_SERVICE_ROLE_KEY/i },
  { name: 'AWS Secret Key', pattern: /aws_secret_access_key/i },
  { name: 'Generic Password Pattern', pattern: /password\s*=\s*['"][^'"]{8,}['"]/i },
  { name: 'Database Password', pattern: /postgres:\/\/[^:]+:[^@]+@/i }
];

export function validateReleaseManifest(manifest: ReleaseManifest): ManifestValidationResult {
  const errors: string[] = [];

  if (manifest.platform !== 'win32' || manifest.arch !== 'x64') {
    errors.push('A plataforma deve ser win32 e arquitetura x64 para o instalador.');
  }

  if (manifest.language !== 'pt-BR') {
    errors.push('O idioma deve ser pt-BR.');
  }

  // Validação estrita das fronteiras do MVP (RF-16)
  if (manifest.boundaries.webcamSupported) {
    errors.push('Violação de RF-16: webcam não é suportada no escopo do MVP.');
  }
  if (manifest.boundaries.recordingSupported) {
    errors.push('Violação de RF-16: gravação local/nuvem não é suportada no escopo do MVP.');
  }
  if (manifest.boundaries.dmVoiceSupported) {
    errors.push('Violação de RF-16: chamada de voz em DM não é suportada no escopo do MVP.');
  }

  // Validação dos arquivos mínimos obrigatórios
  const requiredFiles = [
    'dist-electron/main/index.js',
    'dist-electron/preload/index.cjs',
    'dist/index.html'
  ];

  for (const req of requiredFiles) {
    const found = manifest.files.some((f) => f.path.replace(/\\/g, '/') === req);
    if (!found) {
      errors.push(`Arquivo obrigatório ausente no manifesto de release: ${req}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export function auditReleaseArtifacts(files: Record<string, string>): SecurityAuditResult {
  const detectedViolations: string[] = [];

  for (const [filePath, content] of Object.entries(files)) {
    for (const rule of FORBIDDEN_SECRET_PATTERNS) {
      if (rule.pattern.test(content)) {
        detectedViolations.push(`Arquivo ${filePath} contém padrão sensível: ${rule.name}`);
      }
    }
  }

  return {
    hasSecrets: detectedViolations.length > 0,
    detectedViolations
  };
}
