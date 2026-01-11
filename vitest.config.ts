import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    __BUILD_TIME__: JSON.stringify('2026-01-11T14:30:00Z'),
  },
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
