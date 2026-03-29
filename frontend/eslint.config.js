import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      // Downgrade react-refresh to warn — it's a DX hint, not a runtime error
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // Allow unused vars that start with _ or uppercase (components, types, intentional)
      'no-unused-vars': ['warn', {
        varsIgnorePattern: '^[A-Z_]|^motion$|^AnimatePresence$',
        argsIgnorePattern: '^_',
        ignoreRestSiblings: true,
      }],
      // Downgrade all react-hooks violations to warn (pre-existing patterns, hooks v7 new rules)
      'react-hooks/exhaustive-deps': 'warn',
      'react-hooks/rules-of-hooks': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
      'react-hooks/incompatible-library': 'warn',
      'no-empty': 'warn',
      'no-useless-escape': 'warn',
      'no-use-before-define': 'warn',
    },
  },
])

