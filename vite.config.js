import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  root: 'client',
  resolve: {
    alias: { '@': path.resolve(__dirname, 'client/src') }
  },
  server: {
    port: 5173,
    proxy: {
      '/trpc': 'http://localhost:3000',
      '/socket.io': { target: 'http://localhost:3000', ws: true }
    }
  },
  define: {
    '__VITE_GA4_ID__': JSON.stringify(process.env.VITE_GA4_ID || ''),
  },
  build: {
    outDir: path.resolve(__dirname, 'dist/client'),
    emptyOutDir: true
  }
});
