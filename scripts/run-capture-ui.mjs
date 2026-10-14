import electron from 'electron';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
delete env.VITE_DEV_SERVER_URL;

const child = spawn(electron, [root, '--capture-ui-screens'], {
  cwd: root,
  env,
  stdio: 'inherit'
});

child.on('exit', (code) => {
  process.exitCode = code ?? 0;
});
