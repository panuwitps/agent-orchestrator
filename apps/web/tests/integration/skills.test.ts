import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// next-auth imports `next/server` via ESM which Node can't resolve in test context.
// Mock @/lib/auth and next/cache so the module loads without a Next.js runtime.
vi.mock('@/lib/auth', () => ({
  auth: vi.fn().mockResolvedValue(null),
}))
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

import { prisma } from '@ao/db'
import { createSkillAction, updateSkillAction, deleteSkillAction } from '@/app/(app)/skills/actions'
import { listSkillsForOwner } from '@ao/db'

async function makeOwner() {
  return prisma.user.create({
    data: { email: `t+${Date.now()}@t.com`, role: 'OWNER' },
  })
}

describe('skills CRUD', () => {
  beforeEach(async () => {
    await prisma.roleSkill.deleteMany()
    await prisma.skill.deleteMany()
    await prisma.user.deleteMany()
    vi.stubEnv('AUTH_MODE', 'local')
  })
  afterEach(() => vi.unstubAllEnvs())

  it('creates a skill owned by the current user', async () => {
    const u = await makeOwner()
    const res = await createSkillAction(u.id, {
      name: 'tdd',
      description: 'TDD workflow',
      content: '# TDD\n\nRed-Green-Refactor.',
      frontmatter: { trigger: 'tests' },
      compatibleProviders: ['claude'],
    })
    expect(res.ok).toBe(true)
    const list = await listSkillsForOwner(u.id)
    expect(list).toHaveLength(1)
    expect(list[0]!.name).toBe('tdd')
  })

  it('rejects duplicate name for same owner', async () => {
    const u = await makeOwner()
    await createSkillAction(u.id, {
      name: 'dup', description: '', content: 'x', frontmatter: {}, compatibleProviders: [],
    })
    const res = await createSkillAction(u.id, {
      name: 'dup', description: '', content: 'y', frontmatter: {}, compatibleProviders: [],
    })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error.toLowerCase()).toContain('already exists')
  })

  it('updates and deletes', async () => {
    const u = await makeOwner()
    const created = await createSkillAction(u.id, {
      name: 's1', description: 'd', content: 'c', frontmatter: {}, compatibleProviders: [],
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return
    const upd = await updateSkillAction(u.id, created.data.id, {
      name: 's1', description: 'd2', content: 'c', frontmatter: {}, compatibleProviders: ['codex'],
    })
    expect(upd.ok).toBe(true)
    const del = await deleteSkillAction(u.id, created.data.id)
    expect(del.ok).toBe(true)
    expect(await listSkillsForOwner(u.id)).toHaveLength(0)
  })
})
