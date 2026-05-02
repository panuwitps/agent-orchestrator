import path from 'path'
import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'

const env = loadEnv('', process.cwd(), '')

// next-auth imports `next/server` which is only resolvable from apps/web.
// Point vite's resolver to that package so integration tests can import
// server actions that transitively import next-auth.
const nextPkg = path.resolve(
  __dirname,
  'node_modules/.pnpm/next@15.5.15_react-dom@19.2.5_react@19.2.5__react@19.2.5/node_modules/next',
)

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
    testTimeout: 30_000,
    env,
  },
})
