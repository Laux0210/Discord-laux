import { execSync } from 'node:child_process';
import { copyFileSync, writeFileSync, mkdirSync, cpSync, rmSync, mkdtempSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';

const root = resolve(import.meta.dirname, '..');
const dist = resolve(root, 'dist');

console.log('--- Iniciando Publicação no GitHub Pages ---');

// 1. Build de produção
console.log('1. Compilando aplicação web...');
execSync('npm run build', { cwd: root, stdio: 'inherit' });

// 2. Preparar arquivos estáticos para o GitHub Pages
console.log('2. Preparando 404.html e .nojekyll...');
copyFileSync(resolve(dist, 'index.html'), resolve(dist, '404.html'));
writeFileSync(resolve(dist, '.nojekyll'), '');

// 3. Criar repositório temporário isolado para a branch gh-pages
const tempDir = mkdtempSync(join(tmpdir(), 'discord-gh-pages-'));
console.log(`3. Montando branch gh-pages em diretório isolado: ${tempDir}`);

try {
  cpSync(dist, tempDir, { recursive: true });

  execSync('git init', { cwd: tempDir, stdio: 'ignore' });
  execSync('git config user.name "github-actions[bot]"', { cwd: tempDir, stdio: 'ignore' });
  execSync('git config user.email "github-actions[bot]@users.noreply.github.com"', { cwd: tempDir, stdio: 'ignore' });
  execSync('git checkout -b gh-pages', { cwd: tempDir, stdio: 'ignore' });
  execSync('git remote add origin https://github.com/Laux0210/Discord-laux.git', { cwd: tempDir, stdio: 'ignore' });
  execSync('git add .', { cwd: tempDir, stdio: 'ignore' });
  execSync('git commit -m "Deploy Discord Web to GitHub Pages"', { cwd: tempDir, stdio: 'ignore' });

  console.log('4. Enviando branch gh-pages para o repositório remoto...');
  execSync('git push -f origin gh-pages', { cwd: tempDir, stdio: 'inherit' });

  console.log('✅ Publicação concluída com sucesso!');
  console.log('🌐 O site/app está disponível em: https://laux0210.github.io/Discord-laux/');
} finally {
  try {
    rmSync(tempDir, { recursive: true, force: true });
  } catch {
    // Ignora erro de limpeza temporária
  }
}
