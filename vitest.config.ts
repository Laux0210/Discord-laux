import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/unit/**/*.{test,spec}.{ts,tsx}']
  },
  resolve: {
    alias: {
      '@common': resolve(__dirname, 'src/common'),
      '@renderer': resolve(__dirname, 'src/renderer/src')
    }
  }
});
