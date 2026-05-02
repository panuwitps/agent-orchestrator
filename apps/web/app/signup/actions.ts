'use server'

import bcrypt from 'bcryptjs'
import { prisma } from '../../lib/prisma'
import { resolveAuthMode, isSignupAllowed } from '../../lib/auth-mode'
import { SignupInput } from '@ao/shared'

type Result = { ok: true; userId: string } | { ok: false; error: string }

export async function signupAction(raw: unknown): Promise<Result> {
  const parsed = SignupInput.safeParse(raw)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? 'invalid input' }
  }
  const mode = resolveAuthMode()
  const existing = await prisma.user.count()
  if (!isSignupAllowed(mode, existing)) {
    return { ok: false, error: 'Signup is disabled in this mode' }
  }
  const hashed = await bcrypt.hash(parsed.data.password, 10)
  const user = await prisma.user.create({
    data: {
      email: parsed.data.email,
      hashedPassword: hashed,
      name: parsed.data.name,
      role: existing === 0 ? 'OWNER' : 'MEMBER',
    },
  })
  return { ok: true, userId: user.id }
}
