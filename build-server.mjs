// build-server.mjs — Compile server TypeScript → JavaScript using esbuild
import { build } from 'esbuild';
import { readFileSync, mkdirSync, cpSync, existsSync } from 'fs';

// Read package.json to get all dependencies
const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));
const allDeps = [
  ...Object.keys(pkg.dependencies || {}),
  ...Object.keys(pkg.devDependencies || {}),
];

// Bundle zod into the server (zod 3.25 has no pre-built dist/, only src/)
// All other deps remain external — installed separately in Docker production stage
const BUNDLE_INTO_SERVER = ['zod'];
const externalDeps = allDeps.filter(d => !BUNDLE_INTO_SERVER.includes(d));

await build({
  entryPoints: ['server/src/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  outfile: 'dist/server/index.js',
  sourcemap: false,
  minify: false,
  external: externalDeps,
  // Resolve zod from source TS (zod 3.25 exports @zod/source condition)
  conditions: ['@zod/source', 'import', 'module', 'default'],
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

// Copy font files for PDF RTL support (Arabic, Hebrew, Unicode)
const fontsDir = 'server/src/services/fonts';
const distFontsDir = 'dist/server/fonts';
if (existsSync(fontsDir)) {
  mkdirSync(distFontsDir, { recursive: true });
  cpSync(fontsDir, distFontsDir, { recursive: true });
  console.log('✅ Fonts copied to dist/server/fonts');
}

console.log('✅ Server compiled to dist/server/index.js');
