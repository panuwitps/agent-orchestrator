import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'

const env = loadEnv('', process.cwd(), '')

export default defineConfig({
  test: {
    include: ['packages/*/tests/**/*.test.ts', 'apps/*/tests/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/integration/**'],
    environment: 'node',
    globals: false,
    env,
  },
})
