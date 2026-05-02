import { prisma } from '../index'
import type { Role, Effort } from '@prisma/client'

export type RoleCreateInput = {
  name: string
  description: string
  systemPrompt: string
  defaultProviderId?: string | null
  defaultModel?: string | null
  defaultEffort: Effort
  toolPermissions: { read: boolean; edit: boolean; bash: boolean; webFetch: boolean }
  skillIds: string[]
}

export async function listRolesForOwner(ownerId: string) {
  return prisma.role.findMany({
    where: { ownerId },
    include: { skills: { include: { skill: true } } },
    orderBy: { name: 'asc' },
  })
}

export async function getRoleForOwner(ownerId: string, id: string) {
  return prisma.role.findFirst({
    where: { id, ownerId },
    include: { skills: { include: { skill: true } } },
  })
}

export async function createRole(ownerId: string, input: RoleCreateInput): Promise<Role> {
  return prisma.role.create({
    data: {
      ownerId,
      name: input.name,
      description: input.description,
      systemPrompt: input.systemPrompt,
      defaultProviderId: input.defaultProviderId ?? null,
      defaultModel: input.defaultModel ?? null,
      defaultEffort: input.defaultEffort,
      toolPermissions: input.toolPermissions as object,
      skills: {
        create: input.skillIds.map((skillId) => ({ skillId })),
      },
    },
  })
}

export async function updateRole(ownerId: string, id: string, input: RoleCreateInput): Promise<Role | null> {
  const existing = await getRoleForOwner(ownerId, id)
  if (!existing) return null
  return prisma.role.update({
    where: { id },
    data: {
      name: input.name,
      description: input.description,
      systemPrompt: input.systemPrompt,
      defaultProviderId: input.defaultProviderId ?? null,
      defaultModel: input.defaultModel ?? null,
      defaultEffort: input.defaultEffort,
      toolPermissions: input.toolPermissions as object,
      skills: {
        deleteMany: {},
        create: input.skillIds.map((skillId) => ({ skillId })),
      },
    },
  })
}

export async function deleteRole(ownerId: string, id: string): Promise<boolean> {
  const existing = await getRoleForOwner(ownerId, id)
  if (!existing) return false
  await prisma.role.delete({ where: { id } })
  return true
}
