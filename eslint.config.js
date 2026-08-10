import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    // `site/**` lints itself: it is a separate pnpm workspace on
    // eslint-config-next, and its React rules do not exist in this config.
    // Run `pnpm lint` from inside site/ for that tree.
    ignores: [
      'dist',
      'node_modules',
      'assets/**',
      'technologies/**',
      'features/**',
      '.claude/**',
      'site/**',
    ],
  },
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
);
