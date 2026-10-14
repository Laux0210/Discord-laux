import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { createHash } from 'node:crypto';
import { resolve } from 'path';

function developmentCsp(): Plugin {
  return {
    name: 'local-development-csp',
    apply: 'serve',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        const meta = html.match(/<meta\s+http-equiv="Content-Security-Policy"[^>]*>/i)?.[0];
        if (!meta) throw new Error('Meta CSP ausente no frontend');
        const hashes = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
          .filter((match) => !/\bsrc\s*=/i.test(match[1]))
          .map((match) => "'sha256-" + createHash('sha256').update(match[2]).digest('base64') + "'");
        const policy = meta
          .replace("script-src 'self'", "script-src 'self' " + hashes.join(' '))
          .replace(/connect-src\s+'self'[^;]*/, "connect-src 'self' wss: https: ws://localhost:5173 ws://127.0.0.1:5173 ws://[::1]:5173");
        return html.replace(meta, '').replace('<head>', '<head>\n    ' + policy);
      }
    }
  };
}

export default defineConfig({
  plugins: [react(), developmentCsp()],
  root: 'src/renderer',
  base: './',
  build: {
    outDir: '../../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__dirname, 'src/renderer/index.html')
    }
  },
  resolve: {
    alias: {
      '@common': resolve(__dirname, 'src/common'),
      '@renderer': resolve(__dirname, 'src/renderer/src')
    }
  },
  server: {
    port: 5173,
    strictPort: true
  }
});
