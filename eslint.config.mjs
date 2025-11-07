// ESLint flat config for ESLint 9
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default [
    { ignores: ['dist/**', 'node_modules/**'] },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        languageOptions: {
            parser: tseslint.parser,
            parserOptions: {
                ecmaVersion: 'latest',
                sourceType: 'module',
            },
            globals: { ...globals.browser, ...globals.es2021 },
        },
        rules: {},
    },
];
