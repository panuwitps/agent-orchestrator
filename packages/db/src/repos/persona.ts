import { prisma } from '../index'
import type { Persona } from '@prisma/client'

export type PersonaCreateInput = {
  name: string
  description: string
  identityPrompt: string
  avatarUrl?: string | null
  roleIds: string[]
  defaultRoleId?: string | null
}

export async function listPersonasForOwner(ownerId: string) {
  return prisma.persona.findMany({
    where: { ownerId },
    include: { roles: { include: { role: true } } },
    orderBy: { name: 'asc' },
  })
}

export async function getPersonaForOwner(ownerId: string, id: string) {
  return prisma.persona.findFirst({
    where: { id, ownerId },
    include: { roles: { include: { role: true } } },
  })
}

function buildRoleRows(input: PersonaCreateInput) {
  return input.roleIds.map((roleId, i) => ({
    roleId,
    isDefault: input.defaultRoleId != null && roleId === input.defaultRoleId,
    order: i,
  }))
}

export async function createPersona(ownerId: string, input: PersonaCreateInput): Promise<Persona> {
  return prisma.persona.create({
    data: {
      ownerId,
      name: input.name,
      description: input.description,
      identityPrompt: input.identityPrompt,
      avatarUrl: input.avatarUrl ?? null,
      roles: { create: buildRoleRows(input) },
    },
  })
}

export async function updatePersona(ownerId: string, id: string, input: PersonaCreateInput): Promise<Persona | null> {
  const existing = await getPersonaForOwner(ownerId, id)
  if (!existing) return null
  return prisma.persona.update({
    where: { id },
    data: {
      name: input.name,
      description: input.description,
      identityPrompt: input.identityPrompt,
      avatarUrl: input.avatarUrl ?? null,
      roles: {
        deleteMany: {},
        create: buildRoleRows(input),
      },
    },
  })
}

export async function deletePersona(ownerId: string, id: string): Promise<boolean> {
  const existing = await getPersonaForOwner(ownerId, id)
  if (!existing) return false
  await prisma.persona.delete({ where: { id } })
  return true
}
