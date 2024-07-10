// @ts-check

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

// import typescriptEslint from '@typescript-eslint/eslint-plugin';
// import globals from 'globals';
// import tsParser from '@typescript-eslint/parser';
// import path from 'node:path';
// import { fileURLToPath } from 'node:url';
// import js from '@eslint/js';
// import { FlatCompat } from '@eslint/eslintrc';

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);
// const compat = new FlatCompat({
//   baseDirectory: __dirname,
//   recommendedConfig: js.configs.recommended,
//   allConfig: js.configs.all,
// });

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...tseslint.configs.strict,
  ...tseslint.configs.stylistic
);

// /*export default*/ const x = [
//   {
//     ignores: ['dist/**/*', 'docs/**/*', 'node_modules/**/*'],
//   },
//   ...compat.extends('plugin:@typescript-eslint/recommended'),
//   {
//     plugins: {
//       '@typescript-eslint': typescriptEslint,
//     },

//     languageOptions: {
//       globals: {
//         ...globals.node,
//         ...globals.mocha,
//       },

//       parser: tsParser,
//       // ecmaVersion: 2018,
//       // sourceType: 'module',

//       parserOptions: {
//         ecmaFeatures: {},
//         tsconfigRootDir: '.',
//         project: ['./tsconfig.json'],
//       },
//     },

//     settings: {
//       'import/resolver': {
//         node: {
//           extensions: ['.js', '.mjs', '.ts'],
//         },
//       },
//     },

//     rules: {
//       'linebreak-style': 'off',
//       'no-console': 'off',
//       'no-continue': 'off',

//       'no-param-reassign': [
//         'error',
//         {
//           props: false,
//         },
//       ],

//       'no-plusplus': 'off',
//       'no-restricted-syntax': [
//         'error',
//         'ForInStatement',
//         'LabeledStatement',
//         'WithStatement',
//       ],

//       'no-underscore-dangle': [
//         'error',
//         {
//           allow: ['__dirname', '__filename', '_filename', '_missing'],
//           allowAfterThis: true,
//           allowAfterSuper: true,
//         },
//       ],

//       'no-use-before-define': ['error', 'nofunc'],
//       'sort-keys': 'off',
//     },
//   },
//   {
//     files: ['test/**', '**/*.spec.mjs', '**/*.test.ts'],

//     rules: {
//       '@typescript-eslint/no-empty-function': 'off',
//       'no-unused-expressions': 'off',
//     },
//   },
// ];
