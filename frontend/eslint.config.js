import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

// Minimal, focused config: this project has no prior lint setup. Rather than
// pulling in the full js/typescript-eslint "recommended" rule sets (which
// would surface a large backlog of unrelated style/type issues across a
// ~7700-line legacy file), we scope this to the react-hooks rules that
// matter for catching stale-closure / conditional-hook bugs. The TS parser
// is still needed so react-hooks/exhaustive-deps can correctly analyze TSX.
export default defineConfig([
  globalIgnores(['dist', '.vite', 'node_modules']),
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tseslint.parser,
      ecmaVersion: 2020,
      sourceType: 'module',
      globals: globals.browser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
    },
  },
])
