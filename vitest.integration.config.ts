import path from 'path'
import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'

const env = loadEnv('', process.cwd(), '')

// next-auth imports `next/server` which is only resolvable from apps/web.
// Point vite's resolver to that package so integration tests can import
// server actions that transitively import next-auth.
const nextPkg = path.resolve(__dirname, 'apps/web/node_modules/next')

export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    alias: {
      next: nextPkg,
    },
  },
  test: {
    include: ['**/integration/**/*.test.ts'],
    environment: 'node',
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
    fileParallelism: false,
    testTimeout: 30_000,
    env,
  },
})
