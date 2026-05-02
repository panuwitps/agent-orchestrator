import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

vi.mock('@/lib/auth', () => ({
  auth: vi.fn().mockResolvedValue(null),
}))
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

import { prisma } from '@ao/db'
import { createRoleAction, updateRoleAction, deleteRoleAction } from '@/app/(app)/roles/actions'
import { listRolesForOwner } from '@ao/db'

async function makeOwner() {
  return prisma.user.create({ data: { email: `r+${Date.now()}+${Math.random()}@t.com`, role: 'OWNER' } })
}

describe('roles CRUD', () => {
  beforeEach(async () => {
    await prisma.roleSkill.deleteMany()
    await prisma.role.deleteMany()
    await prisma.skill.deleteMany()
    await prisma.user.deleteMany()
    vi.stubEnv('AUTH_MODE', 'local')
  })
  afterEach(() => vi.unstubAllEnvs())

  it('creates a role with attached skills', async () => {
    const u = await makeOwner()
    const skill = await prisma.skill.create({
      data: { ownerId: u.id, name: 'tdd', description: '', content: '', frontmatter: {}, compatibleProviders: [] },
    })
    const res = await createRoleAction(u.id, {
      name: 'Backend',
      description: 'be',
      systemPrompt: 'you are backend',
      defaultEffort: 'high',
      toolPermissions: { read: true, edit: true, bash: false, webFetch: true },
      skillIds: [skill.id],
    })
    expect(res.ok).toBe(true)
    const list = await listRolesForOwner(u.id)
    expect(list).toHaveLength(1)
    expect(list[0]!.skills).toHaveLength(1)
  })

  it('updates skill set on role', async () => {
    const u = await makeOwner()
    const s1 = await prisma.skill.create({ data: { ownerId: u.id, name: 'a', description: '', content: '', frontmatter: {}, compatibleProviders: [] } })
    const s2 = await prisma.skill.create({ data: { ownerId: u.id, name: 'b', description: '', content: '', frontmatter: {}, compatibleProviders: [] } })
    const created = await createRoleAction(u.id, { name: 'r', description: '', systemPrompt: 'p', defaultEffort: 'high', toolPermissions: { read: true, edit: true, bash: true, webFetch: true }, skillIds: [s1.id] })
    expect(created.ok).toBe(true)
    if (!created.ok) return
    const upd = await updateRoleAction(u.id, created.data.id, { name: 'r', description: '', systemPrompt: 'p', defaultEffort: 'high', toolPermissions: { read: true, edit: true, bash: true, webFetch: true }, skillIds: [s2.id] })
    expect(upd.ok).toBe(true)
    const after = await listRolesForOwner(u.id)
    expect(after[0]!.skills.map((rs) => rs.skillId)).toEqual([s2.id])
  })

  it('deletes a role', async () => {
    const u = await makeOwner()
    const created = await createRoleAction(u.id, { name: 'x', description: '', systemPrompt: 'p', defaultEffort: 'high', toolPermissions: { read: true, edit: true, bash: true, webFetch: true }, skillIds: [] })
    expect(created.ok).toBe(true)
    if (!created.ok) return
    const del = await deleteRoleAction(u.id, created.data.id)
    expect(del.ok).toBe(true)
    expect(await listRolesForOwner(u.id)).toHaveLength(0)
  })

  it('rejects renaming a role to an existing name', async () => {
    const u = await makeOwner()
    const a = await createRoleAction(u.id, { name: 'a', description: '', systemPrompt: 'p', defaultEffort: 'high', toolPermissions: { read: true, edit: true, bash: true, webFetch: true }, skillIds: [] })
    const b = await createRoleAction(u.id, { name: 'b', description: '', systemPrompt: 'p', defaultEffort: 'high', toolPermissions: { read: true, edit: true, bash: true, webFetch: true }, skillIds: [] })
    expect(a.ok).toBe(true)
    expect(b.ok).toBe(true)
    if (!b.ok) return
    const res = await updateRoleAction(u.id, b.data.id, { name: 'a', description: '', systemPrompt: 'p', defaultEffort: 'high', toolPermissions: { read: true, edit: true, bash: true, webFetch: true }, skillIds: [] })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error.toLowerCase()).toContain('already exists')
  })

  it('cannot read or mutate a role owned by another user', async () => {
    const owner = await makeOwner()
    const attacker = await prisma.user.create({ data: { email: `atk+${Date.now()}+${Math.random()}@t.com`, role: 'OWNER' } })
    const created = await createRoleAction(owner.id, {
      name: 'secret', description: '', systemPrompt: 'p', defaultEffort: 'high',
      toolPermissions: { read: true, edit: true, bash: true, webFetch: true }, skillIds: [],
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return
    const upd = await updateRoleAction(attacker.id, created.data.id, {
      name: 'stolen', description: '', systemPrompt: 'p', defaultEffort: 'high',
      toolPermissions: { read: true, edit: true, bash: true, webFetch: true }, skillIds: [],
    })
    expect(upd.ok).toBe(false)
    if (!upd.ok) expect(upd.error.toLowerCase()).toContain('not found')
    const del = await deleteRoleAction(attacker.id, created.data.id)
    expect(del.ok).toBe(false)
    expect(await listRolesForOwner(owner.id)).toHaveLength(1)
  })
})
