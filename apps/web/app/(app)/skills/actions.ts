'use server'

import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import { ok, fail, type ActionResult } from '@/lib/action-result'
import {
  Prisma,
  createSkill,
  updateSkill,
  deleteSkill,
  type SkillCreateInput,
} from '@ao/db'
import { SkillInput } from '@ao/shared'

async function ownerId(): Promise<string | null> {
  const session = await auth()
  return session?.user?.id ?? null
}

export async function createSkillAction(
  callerId: string | null,
  raw: unknown,
): Promise<ActionResult<{ id: string }>> {
  const uid = callerId ?? (await ownerId())
  if (!uid) return fail('not authenticated')
  const parsed = SkillInput.safeParse(raw)
  if (!parsed.success) return fail(parsed.error.errors[0]?.message ?? 'invalid input')
  try {
    const skill = await createSkill(uid, parsed.data as SkillCreateInput)
    revalidatePath('/skills')
    return ok({ id: skill.id })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return fail('A skill with this name already exists')
    }
    throw e
  }
}

export async function updateSkillAction(
  callerId: string | null,
  id: string,
  raw: unknown,
): Promise<ActionResult<{ id: string }>> {
  const uid = callerId ?? (await ownerId())
  if (!uid) return fail('not authenticated')
  const parsed = SkillInput.safeParse(raw)
  if (!parsed.success) return fail(parsed.error.errors[0]?.message ?? 'invalid input')
  try {
    const updated = await updateSkill(uid, id, parsed.data as SkillCreateInput)
    if (!updated) return fail('not found')
    revalidatePath('/skills')
    revalidatePath(`/skills/${id}/edit`)
    return ok({ id: updated.id })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return fail('A skill with this name already exists')
    }
    throw e
  }
}

export async function deleteSkillAction(
  callerId: string | null,
  id: string,
): Promise<ActionResult<{ id: string }>> {
  const uid = callerId ?? (await ownerId())
  if (!uid) return fail('not authenticated')
  const deleted = await deleteSkill(uid, id)
  if (!deleted) return fail('not found')
  revalidatePath('/skills')
  return ok({ id })
}
