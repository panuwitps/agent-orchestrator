import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

vi.mock('@/lib/auth', () => ({
  auth: vi.fn().mockResolvedValue(null),
}))
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

import { prisma } from '@ao/db'
import { createPersonaAction, updatePersonaAction, deletePersonaAction } from '@/app/(app)/personas/actions'
import { listPersonasForOwner } from '@ao/db'

async function makeOwner() {
  return prisma.user.create({ data: { email: `p+${Date.now()}+${Math.random()}@t.com`, role: 'OWNER' } })
}

async function makeRole(ownerId: string, name: string) {
  return prisma.role.create({
    data: {
      ownerId,
      name,
      description: '',
      systemPrompt: 'p',
      defaultEffort: 'HIGH',
      toolPermissions: { read: true, edit: true, bash: true, webFetch: true },
    },
  })
}

describe('personas CRUD', () => {
  beforeEach(async () => {
    await prisma.personaRole.deleteMany()
    await prisma.persona.deleteMany()
    await prisma.roleSkill.deleteMany()
    await prisma.role.deleteMany()
    await prisma.skill.deleteMany()
    await prisma.user.deleteMany()
    vi.stubEnv('AUTH_MODE', 'local')
  })
  afterEach(() => vi.unstubAllEnvs())

  it('creates a persona with attached roles and a default', async () => {
    const u = await makeOwner()
    const r1 = await makeRole(u.id, 'r1')
    const r2 = await makeRole(u.id, 'r2')
    const res = await createPersonaAction(u.id, {
      name: 'Senior Engineer',
      description: 'd',
      identityPrompt: 'you are senior',
      roleIds: [r1.id, r2.id],
      defaultRoleId: r2.id,
    })
    expect(res.ok).toBe(true)
    const list = await listPersonasForOwner(u.id)
    expect(list).toHaveLength(1)
    expect(list[0]!.roles).toHaveLength(2)
    expect(list[0]!.roles.find((pr) => pr.isDefault)?.roleId).toBe(r2.id)
  })

  it('updates the role list and the default flag', async () => {
    const u = await makeOwner()
    const r1 = await makeRole(u.id, 'r1')
    const r2 = await makeRole(u.id, 'r2')
    const created = await createPersonaAction(u.id, {
      name: 'p1', description: '', identityPrompt: 'p', roleIds: [r1.id], defaultRoleId: r1.id,
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return
    const upd = await updatePersonaAction(u.id, created.data.id, {
      name: 'p1', description: '', identityPrompt: 'p', roleIds: [r2.id], defaultRoleId: r2.id,
    })
    expect(upd.ok).toBe(true)
    const after = await listPersonasForOwner(u.id)
    expect(after[0]!.roles.map((pr) => pr.roleId)).toEqual([r2.id])
    expect(after[0]!.roles[0]!.isDefault).toBe(true)
  })

  it('deletes a persona', async () => {
    const u = await makeOwner()
    const created = await createPersonaAction(u.id, {
      name: 'gone', description: '', identityPrompt: 'p', roleIds: [], defaultRoleId: null,
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return
    const del = await deletePersonaAction(u.id, created.data.id)
    expect(del.ok).toBe(true)
    expect(await listPersonasForOwner(u.id)).toHaveLength(0)
  })

  it('rejects renaming a persona to an existing name', async () => {
    const u = await makeOwner()
    const a = await createPersonaAction(u.id, { name: 'a', description: '', identityPrompt: 'p', roleIds: [], defaultRoleId: null })
    const b = await createPersonaAction(u.id, { name: 'b', description: '', identityPrompt: 'p', roleIds: [], defaultRoleId: null })
    expect(a.ok).toBe(true)
    expect(b.ok).toBe(true)
    if (!b.ok) return
    const res = await updatePersonaAction(u.id, b.data.id, { name: 'a', description: '', identityPrompt: 'p', roleIds: [], defaultRoleId: null })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error.toLowerCase()).toContain('already exists')
  })

  it('cannot read or mutate a persona owned by another user', async () => {
    const owner = await makeOwner()
    const attacker = await prisma.user.create({ data: { email: `atk+${Date.now()}+${Math.random()}@t.com`, role: 'OWNER' } })
    const created = await createPersonaAction(owner.id, {
      name: 'secret', description: '', identityPrompt: 'p', roleIds: [], defaultRoleId: null,
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return
    const upd = await updatePersonaAction(attacker.id, created.data.id, {
      name: 'stolen', description: '', identityPrompt: 'p', roleIds: [], defaultRoleId: null,
    })
    expect(upd.ok).toBe(false)
    const del = await deletePersonaAction(attacker.id, created.data.id)
    expect(del.ok).toBe(false)
    expect(await listPersonasForOwner(owner.id)).toHaveLength(1)
  })
})
