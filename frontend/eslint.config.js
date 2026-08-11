import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import prettier from 'eslint-config-prettier'

export default tseslint.config(
  { ignores: ['dist', '../src/main/resources/static'] },
  {
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      // configs.flat, no configs: en react-hooks 7 el namespace de arriba sigue siendo
      // eslintrc (plugins como array) y flat config lo rechaza.
      reactHooks.configs.flat['recommended-latest'],
      reactRefresh.configs.vite,
      // Ultimo a proposito: apaga las reglas de formato que chocarian con Prettier.
      // El formato lo decide Prettier, ESLint solo mira correccion.
      prettier,
    ],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
)
