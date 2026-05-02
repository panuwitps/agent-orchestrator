import { spawn } from 'node:child_process'

const procs = [
  { name: 'web         ', cmd: 'pnpm', args: ['--filter', '@ao/web', 'dev'], color: '\x1b[36m' },
  { name: 'orchestrator', cmd: 'pnpm', args: ['--filter', '@ao/orchestrator', 'dev'], color: '\x1b[35m' },
]

for (const p of procs) {
  const child = spawn(p.cmd, p.args, { stdio: ['ignore', 'pipe', 'pipe'] })
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
