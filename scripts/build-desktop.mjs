import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const common = { absWorkingDir: root, bundle: true, platform: 'node', target: 'node22', external: ['electron'], logLevel: 'warning' };
await Promise.all([
  build({ ...common, entryPoints: ['src/main/index.ts'], format: 'esm', outfile: 'dist-electron/main/index.js' }),
  build({ ...common, entryPoints: ['src/preload/index.ts'], format: 'cjs', outfile: 'dist-electron/preload/index.cjs' })
]);
console.log('Desktop: main ESM e preload CJS compilados.');
