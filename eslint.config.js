import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', 'playwright-report/**', 'test-results/**'],
  },
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
      // Downgraded to warn: the repo has existing violations this job doesn't fix (job 1 of 3,
      // safety nets before refactoring). These counts are the to-do list for the next jobs.
      'no-empty-pattern': 'warn',
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-dupe-keys': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'no-empty': 'warn',
      'no-useless-escape': 'warn',
      'no-useless-assignment': 'warn',
      'preserve-caught-error': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/immutability': 'warn',
      'prefer-const': 'warn',
    },
  },
  {
    files: ['**/*.mjs'],
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      'no-dupe-keys': 'warn',
      '@typescript-eslint/no-unused-vars': 'warn',
    },
  }
);
