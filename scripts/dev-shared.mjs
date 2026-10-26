import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { build } from 'esbuild';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = resolve(root, '.local-data/runtime/dev-api.mjs');
await mkdir(resolve(root, '.local-data/runtime'), { recursive: true });
await build({ entryPoints: [resolve(root, 'src/server/shared-server.ts')], outfile: output, bundle: true, platform: 'node', format: 'esm', target: 'node22' });
const { createSharedServer } = await import(pathToFileURL(output).href);
// O mesmo processo possui o banco e recebe Ctrl+C, liberando o lock no Windows.
const backend = createSharedServer({ dataDir: resolve(process.env.SHARED_DATA_DIR ?? '.local-data'), staticDir: resolve(root, 'dist') });
backend.listen(8787, '127.0.0.1', () => console.log('API compartilhada: http://127.0.0.1:8787'));
const frontend = spawn(process.execPath, ['node_modules/vite/bin/vite.js'], {
  cwd: root, stdio: 'inherit', windowsHide: true,
  env: { ...process.env, VITE_SHARED_BACKEND: 'true' },
});
let closing = false;
function stop(code = 0) {
  if (closing) return;
  closing = true;
  frontend.kill();
  backend.close(() => { process.exitCode = code; });
}
backend.on('error', error => { console.error(error.message); stop(1); });
frontend.on('error', error => { console.error(error.message); stop(1); });
frontend.on('exit', code => stop(code ?? 0));
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
