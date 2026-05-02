import { prisma } from '../index'
import type { Project } from '@prisma/client'

export type ProjectCreateInput = {
  name: string
  description: string
}

export type ProjectUpdateInput = ProjectCreateInput & { archived?: boolean }

export async function listProjectsForOwner(ownerId: string) {
  return prisma.project.findMany({
    where: { ownerId },
    orderBy: [{ archived: 'asc' }, { name: 'asc' }],
  })
}

export async function getProjectForOwner(ownerId: string, id: string) {
  return prisma.project.findFirst({
    where: { id, ownerId },
    include: { components: { orderBy: { order: 'asc' } } },
  })
}

export async function createProject(ownerId: string, input: ProjectCreateInput): Promise<Project> {
  return prisma.project.create({
    data: {
      ownerId,
      name: input.name,
      description: input.description,
    },
  })
}

export async function updateProject(
  ownerId: string,
  id: string,
  input: ProjectUpdateInput,
): Promise<Project | null> {
  const existing = await prisma.project.findFirst({ where: { id, ownerId } })
  if (!existing) return null
  return prisma.project.update({
    where: { id },
    data: {
      name: input.name,
      description: input.description,
      archived: input.archived ?? false,
    },
  })
}

export async function deleteProject(ownerId: string, id: string): Promise<boolean> {
  const existing = await prisma.project.findFirst({ where: { id, ownerId } })
  if (!existing) return false
  await prisma.project.delete({ where: { id } })
  return true
}
