import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'

const env = loadEnv('', process.cwd(), '')

export default defineConfig({
  test: {
    include: ['**/integration/**/*.test.ts'],
    environment: 'node',
    pool: 'forks',
    testTimeout: 30_000,
    env,
  },
})
