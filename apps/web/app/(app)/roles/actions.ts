'use server'

import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import { ok, fail, type ActionResult } from '@/lib/action-result'
import { Prisma, createRole, updateRole, deleteRole, type RoleCreateInput } from '@ao/db'
import { RoleInput } from '@ao/shared'

async function uid(): Promise<string | null> {
  const s = await auth()
  return s?.user?.id ?? null
}

const effortMap = { low: 'LOW', medium: 'MEDIUM', high: 'HIGH', max: 'MAX' } as const

export async function createRoleAction(callerId: string | null, raw: unknown): Promise<ActionResult<{ id: string }>> {
  const id = callerId ?? (await uid())
  if (!id) return fail('not authenticated')
  const parsed = RoleInput.safeParse(raw)
  if (!parsed.success) return fail(parsed.error.errors[0]?.message ?? 'invalid input')
  const data: RoleCreateInput = {
    name: parsed.data.name,
    description: parsed.data.description,
    systemPrompt: parsed.data.systemPrompt,
    defaultProviderId: parsed.data.defaultProviderId ?? null,
    defaultModel: parsed.data.defaultModel ?? null,
    defaultEffort: effortMap[parsed.data.defaultEffort],
    toolPermissions: parsed.data.toolPermissions,
    skillIds: parsed.data.skillIds,
  }
  try {
    const role = await createRole(id, data)
    revalidatePath('/roles')
    return ok({ id: role.id })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return fail('A role with this name already exists')
    }
    throw e
  }
}

export async function updateRoleAction(callerId: string | null, roleId: string, raw: unknown): Promise<ActionResult<{ id: string }>> {
  const id = callerId ?? (await uid())
  if (!id) return fail('not authenticated')
  const parsed = RoleInput.safeParse(raw)
  if (!parsed.success) return fail(parsed.error.errors[0]?.message ?? 'invalid input')
  const data: RoleCreateInput = {
    name: parsed.data.name,
    description: parsed.data.description,
    systemPrompt: parsed.data.systemPrompt,
    defaultProviderId: parsed.data.defaultProviderId ?? null,
    defaultModel: parsed.data.defaultModel ?? null,
    defaultEffort: effortMap[parsed.data.defaultEffort],
    toolPermissions: parsed.data.toolPermissions,
    skillIds: parsed.data.skillIds,
  }
  try {
    const upd = await updateRole(id, roleId, data)
    if (!upd) return fail('not found')
    revalidatePath('/roles')
    revalidatePath(`/roles/${roleId}/edit`)
    return ok({ id: upd.id })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return fail('A role with this name already exists')
    }
    throw e
  }
}

export async function deleteRoleAction(callerId: string | null, roleId: string): Promise<ActionResult<{ id: string }>> {
  const id = callerId ?? (await uid())
  if (!id) return fail('not authenticated')
  const ok2 = await deleteRole(id, roleId)
  if (!ok2) return fail('not found')
  revalidatePath('/roles')
  return ok({ id: roleId })
}
