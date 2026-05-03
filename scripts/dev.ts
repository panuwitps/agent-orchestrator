import { spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// Load workspace-root .env so spawned children (Next.js in apps/web/, Hono in
// apps/orchestrator/) inherit AUTH_SECRET, DATABASE_URL, SECRET_KEY, etc.
// Their own cwd doesn't contain a .env, and we don't want to symlink one per app.
function loadRootEnv() {
  const path = resolve(process.cwd(), '.env')
  let raw: string
  try {
    raw = readFileSync(path, 'utf8')
  } catch {
    console.warn(`[dev] no .env at ${path}; relying on inherited environment`)
    return
  }
  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq <= 0) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    // Strip a single inline comment (` # ...`) if present and value isn't quoted
    if (!value.startsWith('"') && !value.startsWith("'")) {
      const hash = value.indexOf(' #')
      if (hash > 0) value = value.slice(0, hash).trim()
    }
    // Strip surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    if (key && process.env[key] === undefined) process.env[key] = value
  }
}

loadRootEnv()

const procs = [
  { name: 'web         ', cmd: 'pnpm', args: ['--filter', '@ao/web', 'dev'], color: '\x1b[36m' },
  { name: 'orchestrator', cmd: 'pnpm', args: ['--filter', '@ao/orchestrator', 'dev'], color: '\x1b[35m' },
]

for (const p of procs) {
  const child = spawn(p.cmd, p.args, { stdio: ['ignore', 'pipe', 'pipe'], env: process.env })
  const prefix = (s: string) => `${p.color}[${p.name}]\x1b[0m ${s}`
  child.stdout.on('data', (b) => process.stdout.write(prefix(b.toString())))
  child.stderr.on('data', (b) => process.stderr.write(prefix(b.toString())))
  child.on('exit', (code) => {
    console.error(prefix(`exited ${code}`))
    process.exit(code ?? 1)
  })
}

const shutdown = () => {
  console.log('\nShutting down…')
  process.exit(0)
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
