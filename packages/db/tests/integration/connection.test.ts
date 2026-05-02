import { describe, it, expect, afterAll } from 'vitest'
import { prisma } from '../../src'

describe('db connection', () => {
  afterAll(async () => {
    await prisma.$disconnect()
  })

  it('connects and returns a user count', async () => {
    const count = await prisma.user.count()
    expect(typeof count).toBe('number')
    expect(count).toBeGreaterThanOrEqual(0)
  })
})
