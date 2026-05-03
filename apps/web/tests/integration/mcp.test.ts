import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

vi.mock('@/lib/auth', () => ({
  auth: vi.fn().mockResolvedValue(null),
}))
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

import { prisma } from '@ao/db'
import {
  createMcpServerAction,
  updateMcpServerAction,
  deleteMcpServerAction,
  revealMcpEnvAction,
} from '@/app/(app)/mcp/actions'
import { listMcpServersForOwner } from '@ao/db'
import type { EncryptedRecord } from '@ao/shared/crypto'

async function makeOwner() {
  return prisma.user.create({ data: { email: `m+${Date.now()}+${Math.random()}@t.com`, role: 'OWNER' } })
}

describe('mcp servers CRUD', () => {
  beforeEach(async () => {
    await prisma.auditLog.deleteMany()
    await prisma.roleMcp.deleteMany()
    await prisma.mcpServer.deleteMany()
    await prisma.user.deleteMany()
    vi.stubEnv('AUTH_MODE', 'local')
  })
  afterEach(() => vi.unstubAllEnvs())

  it('creates a server with encrypted env', async () => {
    const u = await makeOwner()
    const res = await createMcpServerAction(u.id, {
      name: 'github',
      description: 'gh',
      transport: 'stdio',
      command: '/usr/bin/mcp-gh',
      args: [],
      env: { GITHUB_TOKEN: 'ghp_secret_value' },
      compatibleProviders: ['claude'],
    })
    expect(res.ok).toBe(true)
    const list = await listMcpServersForOwner(u.id)
    expect(list).toHaveLength(1)
    const env = list[0]!.envEncrypted as unknown as Record<string, EncryptedRecord>
    expect(env.GITHUB_TOKEN).toBeDefined()
    expect(env.GITHUB_TOKEN!.ciphertext).not.toContain('ghp_secret_value')
    expect(typeof env.GITHUB_TOKEN!.ciphertext).toBe('string')
    expect(typeof env.GITHUB_TOKEN!.iv).toBe('string')
    expect(typeof env.GITHUB_TOKEN!.tag).toBe('string')
  })

  it('updates env adds and removes keys', async () => {
    const u = await makeOwner()
    const created = await createMcpServerAction(u.id, {
      name: 's1',
      description: '',
      transport: 'stdio',
      command: '/x',
      args: [],
      env: { A: '1', B: '2' },
      compatibleProviders: [],
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return
    const upd = await updateMcpServerAction(u.id, created.data.id, {
      name: 's1',
      description: '',
      transport: 'stdio',
      command: '/x',
      args: [],
      env: { A: '1-updated', C: '3' },
      compatibleProviders: [],
    })
    expect(upd.ok).toBe(true)
    const after = await listMcpServersForOwner(u.id)
    const env = after[0]!.envEncrypted as unknown as Record<string, EncryptedRecord>
    expect(Object.keys(env).sort()).toEqual(['A', 'C'])
    expect(env.B).toBeUndefined()
  })

  it('reveal action decrypts and writes audit log', async () => {
    const u = await makeOwner()
    const created = await createMcpServerAction(u.id, {
      name: 's2',
      description: '',
      transport: 'http',
      url: 'https://example.com/mcp',
      args: [],
      env: { API_KEY: 'super-secret' },
      compatibleProviders: [],
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return
    const reveal = await revealMcpEnvAction(u.id, created.data.id, 'API_KEY')
    expect(reveal.ok).toBe(true)
    if (!reveal.ok) return
    expect(reveal.data.value).toBe('super-secret')
    const logs = await prisma.auditLog.findMany({
      where: { userId: u.id, action: 'mcp_secret_reveal', targetId: created.data.id },
    })
    expect(logs).toHaveLength(1)
    expect(logs[0]!.targetType).toBe('McpServer')
  })

  it('deletes a server', async () => {
    const u = await makeOwner()
    const created = await createMcpServerAction(u.id, {
      name: 's3',
      description: '',
      transport: 'stdio',
      command: '/x',
      args: [],
      env: {},
      compatibleProviders: [],
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return
    const del = await deleteMcpServerAction(u.id, created.data.id)
    expect(del.ok).toBe(true)
    expect(await listMcpServersForOwner(u.id)).toHaveLength(0)
  })

  it('cannot read or mutate a server owned by another user', async () => {
    const owner = await makeOwner()
    const attacker = await prisma.user.create({ data: { email: `atk+${Date.now()}+${Math.random()}@t.com`, role: 'OWNER' } })
    const created = await createMcpServerAction(owner.id, {
      name: 's4', description: '', transport: 'stdio', command: '/x', args: [], env: { K: 'v' }, compatibleProviders: [],
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return
    const upd = await updateMcpServerAction(attacker.id, created.data.id, {
      name: 'taken', description: '', transport: 'stdio', command: '/x', args: [], env: {}, compatibleProviders: [],
    })
    expect(upd.ok).toBe(false)
    const reveal = await revealMcpEnvAction(attacker.id, created.data.id, 'K')
    expect(reveal.ok).toBe(false)
    const del = await deleteMcpServerAction(attacker.id, created.data.id)
    expect(del.ok).toBe(false)
    expect(await listMcpServersForOwner(owner.id)).toHaveLength(1)
  })
})
