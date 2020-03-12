module.exports = {
  parser: '@typescript-eslint/parser',
  extends: ['eslint:recommended', 'plugin:prettier/recommended'],
  plugins: ['import'],
  parserOptions: {
    ecmaVersion: 2019,
    sourceType: 'module',
  },
  env: {
    node: true,
    jest: true,
    es6: true,
  },
  rules: {
    // Place to specify ESLint rules. Can be used to overwrite rules specified from the extended configs
    // e.g. "@typescript-eslint/explicit-function-return-type": "off",
    quotes: ['error', 'single', { avoidEscape: true, allowTemplateLiterals: true }],
    'padding-line-between-statements': ['error', 
      { blankLine: "always", prev: "*", next: "block-like" },
      { blankLine: "always", prev: ["const", "let", "var", "block-like"], next: "*"}, 
      { blankLine: "any", prev: ["const", "let", "var"], next: ["const", "let", "var"]},
      { blankLine: "always", prev: "directive", next: "*" }, 
      { blankLine: "any", prev: "directive", next: "directive" }
    ],
    'no-unused-vars': [
      "error",
      { vars: "all", args: "after-used", ignoreRestSiblings: false, argsIgnorePattern: "^_" },
    ],
    'require-atomic-updates': 'off', // many false positives, boring for nonsense
    'import/default': 'off', // these are don't work with TS and TS already checks imports
    'import/no-unresolved': 'off',
    'import/named': 'off',
    'import/no-named-as-default': 'off',
    'import/no-duplicates': 'warn',
    'import/no-extraneous-dependencies': 'warn',
    'import/order': ['warn', { 'newlines-between': 'always' }],
    'import/newline-after-import': 'warn',
  },
  overrides: [
    {
      files: ['*.ts', '*.tsx'],
      extends: [
        'plugin:@typescript-eslint/eslint-recommended',
        'plugin:@typescript-eslint/recommended',
        'prettier/@typescript-eslint',
        'plugin:import/typescript',
      ],
      rules: {
        'no-unused-vars': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-unused-vars': [
          'warn',
          {
            vars: 'all',
            args: 'after-used',
            ignoreRestSiblings: true,
            argsIgnorePattern: '^_',
          },
        ],
        '@typescript-eslint/explicit-function-return-type': [
          'warn',
          {
            allowExpressions: true,
            allowTypedFunctionExpressions: true,
            allowHigherOrderFunctions: true,
          },
        ],
        '@typescript-eslint/no-non-null-assertion': 'off',
      },
      overrides: [
        {
          files: ['*.spec.ts', '*.test.ts'],
          rules: {
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-non-null-assertion': 'off',
            'require-atomic-updates': 'off',
          },
        },
      ],
    },
  ],
}
