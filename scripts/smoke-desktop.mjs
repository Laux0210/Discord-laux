import electron from 'electron';
import { execFileSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
delete env.VITE_DEV_SERVER_URL;

// O smoke valida o shell local (isolamento, CSP, IPC); sem Supabase, nada depende de rede nem de login.
// Variáveis do processo têm prioridade sobre os arquivos .env do Vite.
execFileSync(process.execPath, [fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url)), 'build'], {
  cwd: root,
  env: { ...env, VITE_SUPABASE_URL: '', VITE_SUPABASE_ANON_KEY: '' },
  stdio: 'ignore',
});
const child = spawn(electron, [root, '--desktop-smoke'], { cwd: root, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
let stdout = '';
let stderr = '';
const timer = setTimeout(() => { console.error('Smoke desktop excedeu 25 segundos.'); child.kill(); }, 25_000);
child.stdout.setEncoding('utf8');
child.stderr.setEncoding('utf8');
child.stdout.on('data', (chunk) => { stdout += chunk; });
child.stderr.on('data', (chunk) => { stderr += chunk; });
child.on('error', (error) => { clearTimeout(timer); console.error(error.message); process.exitCode = 1; });
child.on('exit', (code) => {
  clearTimeout(timer);
  const line = stdout.split(/\r?\n/).find((item) => item.startsWith('DESKTOP_SMOKE_RESULT '));
  try {
    const result = JSON.parse(line?.slice('DESKTOP_SMOKE_RESULT '.length) ?? 'null');
    if (code !== 0 || !result?.ok) throw new Error(result?.error ?? `Electron encerrou com código ${code}, sem prova de inicialização.`);
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(error.message);
    if (stderr) console.error(stderr.slice(-4000));
    process.exitCode = 1;
  }
});
