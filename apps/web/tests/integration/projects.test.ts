import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as os from 'node:os'

vi.mock('@/lib/auth', () => ({
  auth: vi.fn().mockResolvedValue(null),
}))
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

import { prisma } from '@ao/db'
import {
  createProjectAction,
  updateProjectAction,
  deleteProjectAction,
  createComponentAction,
  updateComponentAction,
  deleteComponentAction,
} from '@/app/(app)/projects/actions'
import { listProjectsForOwner, listComponentsForProject } from '@ao/db'
import type { EncryptedRecord } from '@ao/shared/crypto'

async function makeOwner() {
  return prisma.user.create({ data: { email: `pj+${Date.now()}+${Math.random()}@t.com`, role: 'OWNER' } })
}

const REAL_PATH = os.tmpdir()  // exists everywhere
const FAKE_PATH = '/var/agent-orchestrator/does/not/exist/' + Date.now()

describe('projects + components CRUD', () => {
  beforeEach(async () => {
    await prisma.component.deleteMany()
    await prisma.projectMembership.deleteMany()
    await prisma.project.deleteMany()
    await prisma.user.deleteMany()
    vi.stubEnv('AUTH_MODE', 'local')
  })
  afterEach(() => vi.unstubAllEnvs())

  it('creates and lists multiple projects', async () => {
    const u = await makeOwner()
    const a = await createProjectAction(u.id, { name: 'Alpha', description: 'one' })
    const b = await createProjectAction(u.id, { name: 'Beta', description: 'two' })
    expect(a.ok).toBe(true)
    expect(b.ok).toBe(true)
    const list = await listProjectsForOwner(u.id)
    expect(list).toHaveLength(2)
  })

  it('archive toggle persists on update', async () => {
    const u = await makeOwner()
    const created = await createProjectAction(u.id, { name: 'Toggle', description: '' })
    expect(created.ok).toBe(true)
    if (!created.ok) return
    const upd = await updateProjectAction(u.id, created.data.id, { name: 'Toggle', description: '' }, true)
    expect(upd.ok).toBe(true)
    const list = await listProjectsForOwner(u.id)
    expect(list[0]!.archived).toBe(true)
  })

  it('deletes a project (cascades components)', async () => {
    const u = await makeOwner()
    const created = await createProjectAction(u.id, { name: 'Goner', description: '' })
    expect(created.ok).toBe(true)
    if (!created.ok) return
    await createComponentAction(u.id, created.data.id, {
      name: 'api', path: REAL_PATH, description: 'd', env: {},
    })
    const del = await deleteProjectAction(u.id, created.data.id)
    expect(del.ok).toBe(true)
    expect(await listProjectsForOwner(u.id)).toHaveLength(0)
  })

  it('component CRUD nested under project; encrypts env', async () => {
    const u = await makeOwner()
    const project = await createProjectAction(u.id, { name: 'WithComponents', description: '' })
    expect(project.ok).toBe(true)
    if (!project.ok) return
    const c1 = await createComponentAction(u.id, project.data.id, {
      name: 'api', path: REAL_PATH, description: 'd1', env: { DB: 'pg://x' },
    })
    const c2 = await createComponentAction(u.id, project.data.id, {
      name: 'web', path: REAL_PATH, description: 'd2', env: {},
    })
    expect(c1.ok).toBe(true)
    expect(c2.ok).toBe(true)
    const components = await listComponentsForProject(u.id, project.data.id)
    expect(components).not.toBeNull()
    expect(components).toHaveLength(2)
    const env = (components![0]!.envEncrypted ?? {}) as unknown as Record<string, EncryptedRecord>
    if (env.DB) expect(env.DB.ciphertext).not.toContain('pg://x')

    if (!c1.ok) return
    const upd = await updateComponentAction(u.id, project.data.id, c1.data.id, {
      name: 'api', path: REAL_PATH, description: 'd1-updated', env: { DB: 'pg://y' },
    })
    expect(upd.ok).toBe(true)
    const del = await deleteComponentAction(u.id, project.data.id, c1.data.id)
    expect(del.ok).toBe(true)
    const after = await listComponentsForProject(u.id, project.data.id)
    expect(after).toHaveLength(1)
  })

  it('rejects non-absolute or non-existent component path', async () => {
    const u = await makeOwner()
    const project = await createProjectAction(u.id, { name: 'PathCheck', description: '' })
    expect(project.ok).toBe(true)
    if (!project.ok) return
    const relRes = await createComponentAction(u.id, project.data.id, {
      name: 'rel', path: 'relative/path', description: 'd', env: {},
    })
    expect(relRes.ok).toBe(false)
    if (!relRes.ok) expect(relRes.error.toLowerCase()).toContain('absolute')

    const missing = await createComponentAction(u.id, project.data.id, {
      name: 'miss', path: FAKE_PATH, description: 'd', env: {},
    })
    expect(missing.ok).toBe(false)
    if (!missing.ok) expect(missing.error.toLowerCase()).toContain('does not exist')
  })

  it('cross-owner isolation for projects and components', async () => {
    const owner = await makeOwner()
    const attacker = await prisma.user.create({ data: { email: `atk+${Date.now()}+${Math.random()}@t.com`, role: 'OWNER' } })
    const project = await createProjectAction(owner.id, { name: 'Secret', description: '' })
    expect(project.ok).toBe(true)
    if (!project.ok) return
    const c = await createComponentAction(owner.id, project.data.id, {
      name: 'api', path: REAL_PATH, description: 'd', env: {},
    })
    expect(c.ok).toBe(true)
    if (!c.ok) return

    const projUpd = await updateProjectAction(attacker.id, project.data.id, { name: 'Stolen', description: '' })
    expect(projUpd.ok).toBe(false)
    const compUpd = await updateComponentAction(attacker.id, project.data.id, c.data.id, {
      name: 'api', path: REAL_PATH, description: 'taken', env: {},
    })
    expect(compUpd.ok).toBe(false)
    const compDel = await deleteComponentAction(attacker.id, project.data.id, c.data.id)
    expect(compDel.ok).toBe(false)
    const projDel = await deleteProjectAction(attacker.id, project.data.id)
    expect(projDel.ok).toBe(false)

    expect(await listProjectsForOwner(owner.id)).toHaveLength(1)
    expect(await listComponentsForProject(owner.id, project.data.id)).toHaveLength(1)
  })
})
