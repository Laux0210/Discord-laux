import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = fileURLToPath(new URL('../', import.meta.url));
const distDir = join(rootDir, 'dist');
const distElectronDir = join(rootDir, 'dist-electron');
const releaseDir = join(rootDir, 'dist-release');

// Padrões de segredos proibidos
const FORBIDDEN_SECRET_PATTERNS = [
  /-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----/i,
  /SUPABASE_SERVICE_ROLE_KEY/i,
  /aws_secret_access_key/i,
  /password\s*=\s*['"][^'"]{8,}['"]/i,
  /postgres:\/\/[^:]+:[^@]+@/i
];

function collectFiles(dir) {
  const results = [];
  if (!existsSync(dir)) return results;
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectFiles(fullPath));
    } else {
      results.push(fullPath);
    }
  }
  return results;
}

function calculateSha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

console.log('--- Iniciando Auditoria e Empacotamento de Release ---');

const allFiles = [...collectFiles(distElectronDir), ...collectFiles(distDir)];

if (allFiles.length === 0) {
  console.error('ERRO: Nenhum arquivo de build encontrado em dist/ ou dist-electron/. Execute npm run build primeiro.');
  process.exit(1);
}

const fileEntries = [];
let secretsDetected = 0;

for (const fullPath of allFiles) {
  const relPath = relative(rootDir, fullPath).replace(/\\/g, '/');
  const buffer = readFileSync(fullPath);
  const size = statSync(fullPath).size;
  const sha256 = calculateSha256(buffer);

  // Auditoria de texto para evitar vazamento de credenciais
  const textContent = buffer.toString('utf8');
  for (const pattern of FORBIDDEN_SECRET_PATTERNS) {
    if (pattern.test(textContent)) {
      console.error(`ALERTA DE SEGURANÇA: Segredo detectado em ${relPath}`);
      secretsDetected++;
    }
  }

  fileEntries.push({
    path: relPath,
    sha256,
    size
  });
}

if (secretsDetected > 0) {
  console.error(`Auditoria falhou: ${secretsDetected} violações de segurança detectadas.`);
  process.exit(1);
}

// Cria diretório de release
mkdirSync(releaseDir, { recursive: true });

const manifest = {
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
  files: fileEntries,
  createdAt: new Date().toISOString()
};

const manifestPath = join(releaseDir, 'release-manifest.json');
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');

console.log(`Manifesto de release gerado com sucesso em: ${manifestPath}`);
console.log(`Total de arquivos auditados: ${fileEntries.length}`);
console.log(`Auditoria de segredos: 100% LIMPO (0 violações)`);
console.log('--- Empacotamento de Release Concluído ---');
