import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

vi.mock('@/lib/auth', () => ({
  auth: vi.fn().mockResolvedValue(null),
}))
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

import { prisma } from '@ao/db'
import {
  createPluginAction,
  updatePluginAction,
  deletePluginAction,
  installPluginAction,
} from '@/app/(app)/plugins/actions'
import { listPluginsForOwner } from '@ao/db'

async function makeOwner() {
  return prisma.user.create({ data: { email: `pl+${Date.now()}+${Math.random()}@t.com`, role: 'OWNER' } })
}

describe('plugins CRUD', () => {
  beforeEach(async () => {
    await prisma.rolePlugin.deleteMany()
    await prisma.plugin.deleteMany()
    await prisma.user.deleteMany()
    vi.stubEnv('AUTH_MODE', 'local')
  })
  afterEach(() => vi.unstubAllEnvs())

  it('creates a plugin pinned to claude provider with pending status', async () => {
    const u = await makeOwner()
    const res = await createPluginAction(u.id, {
      name: '@scope/p1',
      version: 'latest',
      source: 'claude_marketplace',
      config: { foo: 'bar' },
    })
    expect(res.ok).toBe(true)
    const list = await listPluginsForOwner(u.id)
    expect(list).toHaveLength(1)
    expect(list[0]!.installStatus).toBe('pending')
    expect(list[0]!.provider.slug).toBe('claude')
  })

  it('install action flips status to installed', async () => {
    const u = await makeOwner()
    const created = await createPluginAction(u.id, {
      name: 'p2', version: 'latest', source: 'claude_marketplace', config: {},
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return
    const inst = await installPluginAction(u.id, created.data.id)
    expect(inst.ok).toBe(true)
    if (!inst.ok) return
    expect(inst.data.status).toBe('installed')
    const list = await listPluginsForOwner(u.id)
    expect(list[0]!.installStatus).toBe('installed')
  }, 10_000)

  it('updates and deletes', async () => {
    const u = await makeOwner()
    const created = await createPluginAction(u.id, {
      name: 'p3', version: 'latest', source: 'claude_marketplace', config: {},
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return
    const upd = await updatePluginAction(u.id, created.data.id, {
      name: 'p3', version: '1.2.3', source: 'manual_path', config: { x: 1 },
    })
    expect(upd.ok).toBe(true)
    const del = await deletePluginAction(u.id, created.data.id)
    expect(del.ok).toBe(true)
    expect(await listPluginsForOwner(u.id)).toHaveLength(0)
  })

  it('cannot read or mutate a plugin owned by another user', async () => {
    const owner = await makeOwner()
    const attacker = await prisma.user.create({ data: { email: `atk+${Date.now()}+${Math.random()}@t.com`, role: 'OWNER' } })
    const created = await createPluginAction(owner.id, {
      name: 'secret', version: 'latest', source: 'claude_marketplace', config: {},
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return
    const upd = await updatePluginAction(attacker.id, created.data.id, {
      name: 'stolen', version: 'latest', source: 'claude_marketplace', config: {},
    })
    expect(upd.ok).toBe(false)
    const inst = await installPluginAction(attacker.id, created.data.id)
    expect(inst.ok).toBe(false)
    const del = await deletePluginAction(attacker.id, created.data.id)
    expect(del.ok).toBe(false)
    expect(await listPluginsForOwner(owner.id)).toHaveLength(1)
  })
})
