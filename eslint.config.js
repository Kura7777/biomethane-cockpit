import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', 'playwright-report/**', 'test-results/**'],
  },
  // Locked to error alongside the other fixed-and-fixed rules (quality job 2 of 3) — a disable
  // comment that stops suppressing anything should fail CI, not quietly linger.
  { linterOptions: { reportUnusedDisableDirectives: 'error' } },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // Fixed and locked to error (quality job 2 of 3) so these can't come back.
      'no-empty-pattern': 'error',
      // argsIgnorePattern/varsIgnorePattern: the codebase already names deliberately-unused
      // params and destructure-to-omit bindings with a leading underscore (e.g. _transitTariff,
      // the { omit: _omitted, ...rest } pattern) — match that existing convention instead of
      // forcing call-site churn.
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-dupe-keys': 'error',
      'no-useless-escape': 'error',
      'no-useless-assignment': 'error',
      'prefer-const': 'error',
      // Still warn: the repo has existing violations this job doesn't fix (job 2 of 3,
      // react-hooks/* and no-explicit-any are job 3's scope, once the big files get split).
      '@typescript-eslint/no-explicit-any': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'no-empty': 'warn',
      'preserve-caught-error': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/immutability': 'warn',
    },
  },
  {
    files: ['**/*.mjs'],
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      'no-dupe-keys': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  }
);
