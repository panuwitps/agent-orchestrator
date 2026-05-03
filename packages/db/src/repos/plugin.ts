import { prisma } from '../index'
import type { Plugin } from '@prisma/client'

export type PluginCreateInput = {
  name: string
  version: string
  source: string
  config: Record<string, unknown>
  providerId: string
}

export async function listPluginsForOwner(ownerId: string) {
  return prisma.plugin.findMany({
    where: { ownerId },
    include: { provider: true },
    orderBy: { name: 'asc' },
  })
}

export async function getPluginForOwner(ownerId: string, id: string) {
  return prisma.plugin.findFirst({
    where: { id, ownerId },
    include: { provider: true },
  })
}

export async function createPlugin(ownerId: string, input: PluginCreateInput): Promise<Plugin> {
  return prisma.plugin.create({
    data: {
      ownerId,
      providerId: input.providerId,
      name: input.name,
      version: input.version,
      source: input.source,
      config: input.config as object,
      installStatus: 'pending',
    },
  })
}

export async function updatePlugin(
  ownerId: string,
  id: string,
  input: Omit<PluginCreateInput, 'providerId'>,
): Promise<Plugin | null> {
  const existing = await getPluginForOwner(ownerId, id)
  if (!existing) return null
  return prisma.plugin.update({
    where: { id },
    data: {
      name: input.name,
      version: input.version,
      source: input.source,
      config: input.config as object,
    },
  })
}

export async function setPluginInstallStatus(
  ownerId: string,
  id: string,
  status: 'pending' | 'installed' | 'failed',
): Promise<Plugin | null> {
  const existing = await getPluginForOwner(ownerId, id)
  if (!existing) return null
  return prisma.plugin.update({ where: { id }, data: { installStatus: status } })
}

export async function deletePlugin(ownerId: string, id: string): Promise<boolean> {
  const existing = await getPluginForOwner(ownerId, id)
  if (!existing) return false
  await prisma.plugin.delete({ where: { id } })
  return true
}
