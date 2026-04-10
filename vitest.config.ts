import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      // zod 3.25 only ships source (uses @zod/source condition) — vitest needs explicit alias
      zod: '/root/boom-contact/node_modules/zod/src/index.ts',
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
