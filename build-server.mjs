// build-server.mjs — Compile server TypeScript → JavaScript using esbuild
import { build } from 'esbuild';

await build({
  entryPoints: ['server/src/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  outfile: 'dist/server/index.js',
  sourcemap: false,
  minify: false,
  // Keep node_modules external — they're installed separately
  packages: 'external',
  banner: {
    // Fix __dirname / __filename for ESM
    js: `
import { createRequire as __createRequire } from 'module';
import { fileURLToPath as __fileURLToPath } from 'url';
import { dirname as __pathDirname } from 'path';
const __filename = __fileURLToPath(import.meta.url);
const __dirname = __pathDirname(__filename);
const require = __createRequire(import.meta.url);
`,
  },
});

console.log('✅ Server compiled to dist/server/index.js');
