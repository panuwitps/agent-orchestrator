'use server'

import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import { ok, fail, type ActionResult } from '@/lib/action-result'
import {
  Prisma,
  prisma,
  createPlugin,
  updatePlugin,
  setPluginInstallStatus,
  deletePlugin,
  type PluginCreateInput,
} from '@ao/db'
import { PluginInput } from '@ao/shared'

async function uid(): Promise<string | null> {
  const s = await auth()
  return s?.user?.id ?? null
}

export async function createPluginAction(callerId: string | null, raw: unknown): Promise<ActionResult<{ id: string }>> {
  const id = callerId ?? (await uid())
  if (!id) return fail('not authenticated')
  const parsed = PluginInput.safeParse(raw)
  if (!parsed.success) return fail(parsed.error.errors[0]?.message ?? 'invalid input')
  const claude = await prisma.provider.findUnique({ where: { slug: 'claude' } })
  if (!claude) return fail('claude provider not seeded')
  const data: PluginCreateInput = {
    name: parsed.data.name,
    version: parsed.data.version,
    source: parsed.data.source,
    config: parsed.data.config,
    providerId: claude.id,
  }
  try {
    const plugin = await createPlugin(id, data)
    revalidatePath('/plugins')
    return ok({ id: plugin.id })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return fail('A plugin with this name already exists')
    }
    throw e
  }
}

export async function updatePluginAction(callerId: string | null, pluginId: string, raw: unknown): Promise<ActionResult<{ id: string }>> {
  const id = callerId ?? (await uid())
  if (!id) return fail('not authenticated')
  const parsed = PluginInput.safeParse(raw)
  if (!parsed.success) return fail(parsed.error.errors[0]?.message ?? 'invalid input')
  try {
    const upd = await updatePlugin(id, pluginId, {
      name: parsed.data.name,
      version: parsed.data.version,
      source: parsed.data.source,
      config: parsed.data.config,
    })
    if (!upd) return fail('not found')
    revalidatePath('/plugins')
    revalidatePath(`/plugins/${pluginId}/edit`)
    return ok({ id: upd.id })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return fail('A plugin with this name already exists')
    }
    throw e
  }
}

export async function deletePluginAction(callerId: string | null, pluginId: string): Promise<ActionResult<{ id: string }>> {
  const id = callerId ?? (await uid())
  if (!id) return fail('not authenticated')
  const ok2 = await deletePlugin(id, pluginId)
  if (!ok2) return fail('not found')
  revalidatePath('/plugins')
  return ok({ id: pluginId })
}

// Mock install pipeline. Real Claude CLI invocation is deferred to Phase 3+.
export async function installPluginAction(callerId: string | null, pluginId: string): Promise<ActionResult<{ id: string; status: string }>> {
  const id = callerId ?? (await uid())
  if (!id) return fail('not authenticated')
  await new Promise((resolve) => setTimeout(resolve, 1_000))
  const upd = await setPluginInstallStatus(id, pluginId, 'installed')
  if (!upd) return fail('not found')
  revalidatePath('/plugins')
  revalidatePath(`/plugins/${pluginId}/edit`)
  return ok({ id: upd.id, status: upd.installStatus })
}
