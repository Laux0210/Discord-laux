import { build } from 'esbuild';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';

const output = fileURLToPath(new URL('../.local-data/runtime/server.mjs', import.meta.url));
await mkdir(new URL('../.local-data/runtime/', import.meta.url), { recursive: true });
await build({ entryPoints: [fileURLToPath(new URL('../src/server/main.ts', import.meta.url))], outfile: output, bundle: true, platform: 'node', format: 'esm', target: 'node22' });
// Keep one process so Ctrl+C reaches the server's graceful shutdown on Windows.
await import(pathToFileURL(output).href);
