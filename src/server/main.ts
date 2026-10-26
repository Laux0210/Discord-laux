import { resolve } from 'node:path';
import { createSharedServer } from './shared-server';

const port = Number(process.env.SHARED_PORT ?? 8787);
if (!Number.isSafeInteger(port) || port < 1 || port > 65535) throw new Error('SHARED_PORT inválida.');
const host = process.env.SHARED_HOST ?? '127.0.0.1';
const server = createSharedServer({
  dataDir: process.env.SHARED_DATA_DIR ? resolve(process.env.SHARED_DATA_DIR) : resolve('.local-data'),
  staticDir: resolve('dist'),
});
server.on('error', error => { console.error(error.message); process.exitCode = 1; });
server.listen(port, host, () => {
  console.log(`Comunidade compartilhada: http://${host}:${port}`);
  console.log(`A primeira conta cadastrada administra o servidor. Dados: ${resolve(process.env.SHARED_DATA_DIR ?? '.local-data', 'shared-state.json')}`);
});
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.on(signal, () => server.close(() => process.exit(0)));
