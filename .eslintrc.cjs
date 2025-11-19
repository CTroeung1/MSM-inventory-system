module.exports = {
  ignorePatterns: ['dist'],
  env: {
    node: true,
    browser: true,
    es2020: true
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'plugin:@typescript-eslint/stylistic-type-checked'
  ],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module'
  },
  plugins: [
    'react-hooks',
    'react-refresh',
    '@typescript-eslint'
  ],
  overrides: [
    {
      files: [
        'server/**/*.{ts,tsx}',
        'prisma/**/*.{ts,tsx}',
        'utils/**/*.{ts,tsx}'
      ],
      parserOptions: {
        project: ['./tsconfig.node.json']
      },
      env: {
        node: true
      }
    },
    {
      files: ['**/*.{ts,tsx}'],
      parserOptions: {
        project: ['./tsconfig.app.json']
      },
      env: {
        browser: true,
        node: true
      },
      rules: {
        'react-hooks/rules-of-hooks': 'error',
        'react-hooks/exhaustive-deps': 'warn',
        'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
        '@typescript-eslint/no-unsafe-argument': 'warn',
        '@typescript-eslint/no-unsafe-call': 'warn',
        '@typescript-eslint/no-explicit-any': 'warn',
        '@typescript-eslint/no-unsafe-member-access': 'warn',
        '@typescript-eslint/no-unsafe-assignment': 'warn',
        '@typescript-eslint/no-misused-promises': 'warn'
      }
    }
  ]
};
