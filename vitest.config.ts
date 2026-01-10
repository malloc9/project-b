import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts', './src/test/setup-i18n.tsx'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.idea/**',
      'src/i18n/__tests__/translationSystemIntegration.test.tsx',
      'src/pages/__tests__/**/*',
      'src/contexts/__tests__/**/*'
    ],
  },
})
