import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { createBrotliCompress, constants as zlibConstants } from 'zlib';
import { createReadStream, createWriteStream, statSync, readdirSync } from 'fs';
import { pipeline } from 'stream/promises';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Vite plugin: pre-compress assets with Brotli (.br) at build time.
 * Express will serve these pre-compressed files when the client supports Brotli.
 */
function brotliCompressPlugin() {
  return {
    name: 'vite-plugin-brotli',
    apply: 'build',
    enforce: 'post',
    async closeBundle() {
      const distDir = path.resolve(__dirname, 'dist/client/assets');
      try {
        const files = readdirSync(distDir);
        const compressible = files.filter(f => /\.(js|css|svg|json|html|xml|txt|wasm)$/.test(f));
        await Promise.all(compressible.map(async (file) => {
          const filePath = path.join(distDir, file);
          const brPath = filePath + '.br';
          const stat = statSync(filePath);
          // Skip small files (<1KB)
          if (stat.size < 1024) return;
          const brotli = createBrotliCompress({
            params: {
              [zlibConstants.BROTLI_PARAM_QUALITY]: 11,
              [zlibConstants.BROTLI_PARAM_SIZE_HINT]: stat.size,
            },
          });
          await pipeline(createReadStream(filePath), brotli, createWriteStream(brPath));
        }));
        console.log(`\nðï¸  Brotli: compressed ${compressible.length} assets in dist/client/assets/`);
      } catch (e) {
        console.warn('Brotli compression skipped:', e.message);
      }

      // Also compress root static files (index.html, manifest.json, sw.js, etc.)
      const rootDir = path.resolve(__dirname, 'dist/client');
      try {
        const rootFiles = readdirSync(rootDir);
        const rootCompressible = rootFiles.filter(f => /\.(html|json|js|xml|txt|webmanifest)$/.test(f));
        await Promise.all(rootCompressible.map(async (file) => {
          const filePath = path.join(rootDir, file);
          const brPath = filePath + '.br';
          const stat = statSync(filePath);
          if (stat.size < 512) return;
          const brotli = createBrotliCompress({
            params: {
              [zlibConstants.BROTLI_PARAM_QUALITY]: 11,
              [zlibConstants.BROTLI_PARAM_SIZE_HINT]: stat.size,
            },
          });
          await pipeline(createReadStream(filePath), brotli, createWriteStream(brPath));
        }));
        console.log(`    + ${rootCompressible.length} root files (index.html, manifest.json, etc.)`);
      } catch (e) {
        console.warn('Root Brotli compression skipped:', e.message);
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), brotliCompressPlugin()],
  root: 'client',
  resolve: {
    alias: { '@': path.resolve(__dirname, 'client/src') },
    // Zod 3.25 ships source TS only (no pre-built dist/) — use @zod/source condition
    conditions: ['@zod/source', 'import', 'module', 'browser', 'default'],
  },
  server: {
    port: 5173,
    proxy: {
      '/trpc': 'http://localhost:3000',
      '/socket.io': { target: 'http://localhost:3000', ws: true }
    }
  },
  build: {
    outDir: path.resolve(__dirname, 'dist/client'),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        chunkFileNames(chunkInfo) {
          const routeChunks = ['ConstatFlow', 'JoinSession'];
          if (routeChunks.includes(chunkInfo.name)) {
            return `assets/${chunkInfo.name}.[hash].js`;
          }
          return 'assets/[name]-[hash].js';
        },
        manualChunks(id) {
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/') || id.includes('@tanstack/react-query') || id.includes('@trpc/')) {
            return 'vendor';
          }
          if (id.includes('node_modules/i18next') || id.includes('node_modules/react-i18next')) {
            return 'i18n';
          }
          if (id.includes('@sentry')) {
            return 'vendor-sentry';
          }
          if (id.includes('posthog-js')) {
            return 'vendor-posthog';
          }
          // Named chunks for route prefetching
          if (id.includes('/pages/ConstatFlow')) {
            return 'ConstatFlow';
          }
          if (id.includes('/pages/JoinSession')) {
            return 'JoinSession';
          }
        },
      },
    },
  }
});
