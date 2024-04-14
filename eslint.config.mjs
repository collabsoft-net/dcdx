
import { FlatCompat } from '@eslint/eslintrc';
import js from '@eslint/js';
import typescriptPlugin from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import simpleImportSortPlugin from 'eslint-plugin-simple-import-sort';
import path from 'path';
import { fileURLToPath } from 'url';

// mimic CommonJS variables -- not needed if using CommonJS
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
    baseDirectory: __dirname
});

export default [
  js.configs.recommended,
  ...compat.extends('plugin:@typescript-eslint/eslint-recommended'),
  ...compat.extends('plugin:@typescript-eslint/recommended'),
  {
    ignores: [ '.yarn' ],
    languageOptions: {
      parser: typescriptParser
    },
    plugins: {
      '@typescript-eslint': typescriptPlugin,
      'simple-import-sort': simpleImportSortPlugin
    },
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/ban-ts-ignore': 'off',
      '@typescript-eslint/no-empty-interface': 'warn',
      '@typescript-eslint/no-empty-function': 'off',
      'simple-import-sort/imports': 'error',
      'quotes': ['error', 'single', { 'allowTemplateLiterals': true }],
      'no-trailing-spaces': 'error',
    }
  }
];