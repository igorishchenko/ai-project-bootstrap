import tseslint from 'typescript-eslint';

/**
 * Correctness rules for {{projectName}}. Formatting is Prettier's job — do not
 * add stylistic rules here, and do not disable a rule to get past an error.
 */
export default tseslint.config(
  { ignores: ['dist', 'build', 'coverage', 'node_modules'{{#if has.nextjs}}, '.next', 'next-env.d.ts'{{/if}}] },
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'always', { null: 'ignore' }],
    },
  },
);
