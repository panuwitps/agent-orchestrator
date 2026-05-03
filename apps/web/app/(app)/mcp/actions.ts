'use server'

import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import { ok, fail, type ActionResult } from '@/lib/action-result'
import {
  Prisma,
  prisma,
  createMcpServer,
  updateMcpServer,
  deleteMcpServer,
  getMcpServerForOwner,
  type McpServerCreateInput,
} from '@ao/db'
import { McpServerInput } from '@ao/shared'
import { encryptEnvMap, decryptEnvValue } from '@/lib/crypto-server'
import type { EncryptedRecord } from '@ao/shared/crypto'

async function uid(): Promise<string | null> {
  const s = await auth()
  return s?.user?.id ?? null
}

function buildCreateInput(parsed: ReturnType<typeof McpServerInput.parse>): McpServerCreateInput {
  return {
    name: parsed.name,
    description: parsed.description,
    transport: parsed.transport,
    command: parsed.command ?? null,
    args: parsed.args,
    url: parsed.url ?? null,
    envEncrypted: encryptEnvMap(parsed.env),
    compatibleProviders: parsed.compatibleProviders,
  }
}

export async function createMcpServerAction(callerId: string | null, raw: unknown): Promise<ActionResult<{ id: string }>> {
  const id = callerId ?? (await uid())
  if (!id) return fail('not authenticated')
  const parsed = McpServerInput.safeParse(raw)
  if (!parsed.success) return fail(parsed.error.errors[0]?.message ?? 'invalid input')
  try {
    const server = await createMcpServer(id, buildCreateInput(parsed.data))
    revalidatePath('/mcp')
    return ok({ id: server.id })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return fail('An MCP server with this name already exists')
    }
    throw e
  }
}

export async function updateMcpServerAction(callerId: string | null, mcpId: string, raw: unknown): Promise<ActionResult<{ id: string }>> {
  const id = callerId ?? (await uid())
  if (!id) return fail('not authenticated')
  const parsed = McpServerInput.safeParse(raw)
  if (!parsed.success) return fail(parsed.error.errors[0]?.message ?? 'invalid input')
  try {
    const upd = await updateMcpServer(id, mcpId, buildCreateInput(parsed.data))
    if (!upd) return fail('not found')
    revalidatePath('/mcp')
    revalidatePath(`/mcp/${mcpId}/edit`)
    return ok({ id: upd.id })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return fail('An MCP server with this name already exists')
    }
    throw e
  }
}

export async function deleteMcpServerAction(callerId: string | null, mcpId: string): Promise<ActionResult<{ id: string }>> {
  const id = callerId ?? (await uid())
  if (!id) return fail('not authenticated')
  const ok2 = await deleteMcpServer(id, mcpId)
  if (!ok2) return fail('not found')
  revalidatePath('/mcp')
  return ok({ id: mcpId })
}

export async function revealMcpEnvAction(
  callerId: string | null,
  mcpId: string,
  envKey: string,
): Promise<ActionResult<{ value: string }>> {
  const id = callerId ?? (await uid())
  if (!id) return fail('not authenticated')
  const server = await getMcpServerForOwner(id, mcpId)
  if (!server) return fail('not found')
  const env = (server.envEncrypted ?? {}) as unknown as Record<string, EncryptedRecord>
  const record = env[envKey]
  if (!record) return fail('env key not set')
  await prisma.auditLog.create({
    data: { userId: id, action: 'mcp_secret_reveal', targetType: 'McpServer', targetId: mcpId, metadata: { envKey } },
  })
  return ok({ value: decryptEnvValue(record) })
}
