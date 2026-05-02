import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'

const env = loadEnv('', process.cwd(), '')

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    include: ['**/integration/**/*.test.ts'],
    environment: 'node',
    pool: 'forks',
    testTimeout: 30_000,
    env,
  },
})
