import { describe, it, expect, afterAll } from 'vitest'
import { prisma } from '../../src'

describe('db connection', () => {
  afterAll(async () => {
    await prisma.$disconnect()
  })

  it('connects and lists zero users', async () => {
    const count = await prisma.user.count()
    expect(count).toBe(0)
  })
})
