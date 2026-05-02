import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { prisma } from '@ao/db'
import { signupAction } from '../../app/signup/actions'

describe('signupAction', () => {
  beforeEach(async () => {
    await prisma.session.deleteMany()
    await prisma.account.deleteMany()
    await prisma.user.deleteMany()
    vi.stubEnv('AUTH_MODE', 'local')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('creates the first user and marks them OWNER', async () => {
    const res = await signupAction({
      email: 'a@a.com',
      password: 'password123',
      name: 'Alice',
    })
    expect(res.ok).toBe(true)
    const user = await prisma.user.findUnique({ where: { email: 'a@a.com' } })
    expect(user?.role).toBe('OWNER')
    expect(user?.hashedPassword).toBeTruthy()
    expect(user?.hashedPassword).not.toBe('password123')
  })

  it('rejects signup once a user exists in local mode', async () => {
    await signupAction({ email: 'a@a.com', password: 'password123' })
    const res = await signupAction({ email: 'b@b.com', password: 'password123' })
    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.error).toMatch(/disabled/i)
    }
  })
})
