import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';
import globals from 'globals';

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettierConfig,
  // Environnements : déclarés par contexte (la flat config n'hérite d'aucun global par défaut)
  { files: ['client/**/*.{ts,tsx,js}', 'shared/**/*.ts'], languageOptions: { globals: { ...globals.browser } } },
  { files: ['client/public/sw.js'], languageOptions: { globals: { ...globals.serviceworker, ...globals.browser } } },
  { files: ['server/**/*.{ts,js}', 'scripts/**/*.{ts,mjs,cjs}', '*.mjs', '*.cjs'], languageOptions: { globals: { ...globals.node } } },
  // Outils CLI : console légitime
  { files: ['scripts/**', 'server/src/scripts/**'], rules: { 'no-console': 'off' } },
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      // TODO chantier dédié : éliminer les `any` progressivement (tsc strict = 0 reste la barrière de types)
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    ignores: ['dist/**', 'node_modules/**', '*.config.js', '*.config.ts', 'ios/**', 'android/**', 'scripts/__pycache__/**', 'scripts/*.cjs'],
  },
];
