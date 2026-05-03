'use server'

import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import { ok, fail, type ActionResult } from '@/lib/action-result'
import { Prisma, createPersona, updatePersona, deletePersona, type PersonaCreateInput } from '@ao/db'
import { PersonaInput } from '@ao/shared'

async function uid(): Promise<string | null> {
  const s = await auth()
  return s?.user?.id ?? null
}

function toCreateInput(parsed: ReturnType<typeof PersonaInput.parse>): PersonaCreateInput {
  return {
    name: parsed.name,
    description: parsed.description,
    identityPrompt: parsed.identityPrompt,
    avatarUrl: parsed.avatarUrl ?? null,
    roleIds: parsed.roleIds,
    defaultRoleId: parsed.defaultRoleId ?? null,
  }
}

export async function createPersonaAction(callerId: string | null, raw: unknown): Promise<ActionResult<{ id: string }>> {
  const id = callerId ?? (await uid())
  if (!id) return fail('not authenticated')
  const parsed = PersonaInput.safeParse(raw)
  if (!parsed.success) return fail(parsed.error.errors[0]?.message ?? 'invalid input')
  try {
    const p = await createPersona(id, toCreateInput(parsed.data))
    revalidatePath('/personas')
    return ok({ id: p.id })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return fail('A persona with this name already exists')
    }
    throw e
  }
}

export async function updatePersonaAction(callerId: string | null, personaId: string, raw: unknown): Promise<ActionResult<{ id: string }>> {
  const id = callerId ?? (await uid())
  if (!id) return fail('not authenticated')
  const parsed = PersonaInput.safeParse(raw)
  if (!parsed.success) return fail(parsed.error.errors[0]?.message ?? 'invalid input')
  try {
    const upd = await updatePersona(id, personaId, toCreateInput(parsed.data))
    if (!upd) return fail('not found')
    revalidatePath('/personas')
    revalidatePath(`/personas/${personaId}/edit`)
    return ok({ id: upd.id })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return fail('A persona with this name already exists')
    }
    throw e
  }
}

export async function deletePersonaAction(callerId: string | null, personaId: string): Promise<ActionResult<{ id: string }>> {
  const id = callerId ?? (await uid())
  if (!id) return fail('not authenticated')
  const ok2 = await deletePersona(id, personaId)
  if (!ok2) return fail('not found')
  revalidatePath('/personas')
  return ok({ id: personaId })
}
