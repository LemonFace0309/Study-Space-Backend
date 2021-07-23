module.exports = {
  extends: ['airbnb-base', 'prettier', 'plugin:node/recommended'],
  plugins: ['prettier'],
  rules: {
    'prettier/prettier': [
      'error',
      {
        endOfLine: 'auto',
      },
      { usePrettierrc: true },
    ],
    'no-unused-vars': 'warn',
    'no-console': 'off',
    'no-process-exit': 'off',
    'class-methods-use-this': 'off',
    'node/no-unsupported-features/es-syntax': 'off',
  },
};
