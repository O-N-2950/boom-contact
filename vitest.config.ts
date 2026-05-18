import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      // zod 3.25 only ships source (uses @zod/source condition) — vitest needs explicit alias.
      // Chemin portable (résolu relativement à ce fichier) : robuste en CI / tout environnement.
      zod: fileURLToPath(new URL('./node_modules/zod/src/index.ts', import.meta.url)),
    },
  },
  test: {
    include: ['server/src/__tests__/**/*.test.ts'],
    environment: 'node',
    globals: false,
    testTimeout: 10000,
    env: {
      DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
      JWT_SECRET: 'test-secret-key-for-vitest',
      ADMIN_PASSWORD: 'TestAdmin12345',
    },
  },
});
