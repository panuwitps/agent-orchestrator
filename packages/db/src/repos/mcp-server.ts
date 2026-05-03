import { prisma } from '../index'
import type { McpServer } from '@prisma/client'

// EncryptedRecord shape mirrors @ao/shared/crypto. Duplicated here to keep
// @ao/db dependency-free from @ao/shared (which would create a cycle).
export type EncryptedRecord = {
  ciphertext: string
  iv: string
  tag: string
  keyVersion: number
}

export type McpServerCreateInput = {
  name: string
  description: string
  transport: string
  command?: string | null
  args: string[]
  url?: string | null
  envEncrypted: Record<string, EncryptedRecord>
  compatibleProviders: string[]
}

export async function listMcpServersForOwner(ownerId: string) {
  return prisma.mcpServer.findMany({
    where: { ownerId },
    orderBy: { name: 'asc' },
  })
}

export async function getMcpServerForOwner(ownerId: string, id: string) {
  return prisma.mcpServer.findFirst({ where: { id, ownerId } })
}

export async function createMcpServer(ownerId: string, input: McpServerCreateInput): Promise<McpServer> {
  return prisma.mcpServer.create({
    data: {
      ownerId,
      name: input.name,
      description: input.description,
      transport: input.transport,
      command: input.command ?? null,
      args: input.args,
      url: input.url ?? null,
      envEncrypted: input.envEncrypted as object,
      compatibleProviders: input.compatibleProviders,
    },
  })
}

export async function updateMcpServer(
  ownerId: string,
  id: string,
  input: McpServerCreateInput,
): Promise<McpServer | null> {
  const existing = await getMcpServerForOwner(ownerId, id)
  if (!existing) return null
  return prisma.mcpServer.update({
    where: { id },
    data: {
      name: input.name,
      description: input.description,
      transport: input.transport,
      command: input.command ?? null,
      args: input.args,
      url: input.url ?? null,
      envEncrypted: input.envEncrypted as object,
      compatibleProviders: input.compatibleProviders,
    },
  })
}

export async function deleteMcpServer(ownerId: string, id: string): Promise<boolean> {
  const existing = await getMcpServerForOwner(ownerId, id)
  if (!existing) return false
  await prisma.mcpServer.delete({ where: { id } })
  return true
}
