import { prisma } from '../index'
import type { Component } from '@prisma/client'
import type { EncryptedRecord } from './mcp-server'

export type ComponentCreateInput = {
  name: string
  path: string
  description: string
  envEncrypted: Record<string, EncryptedRecord>
}

async function ensureProjectOwned(ownerId: string, projectId: string) {
  const project = await prisma.project.findFirst({ where: { id: projectId, ownerId } })
  return project != null
}

export async function listComponentsForProject(ownerId: string, projectId: string) {
  if (!(await ensureProjectOwned(ownerId, projectId))) return null
  return prisma.component.findMany({
    where: { projectId },
    orderBy: { order: 'asc' },
  })
}

export async function getComponentForOwner(ownerId: string, projectId: string, id: string) {
  if (!(await ensureProjectOwned(ownerId, projectId))) return null
  return prisma.component.findFirst({ where: { id, projectId } })
}

export async function createComponent(
  ownerId: string,
  projectId: string,
  input: ComponentCreateInput,
): Promise<Component | null> {
  if (!(await ensureProjectOwned(ownerId, projectId))) return null
  const existing = await prisma.component.findMany({ where: { projectId }, select: { order: true } })
  const nextOrder = existing.reduce((acc, c) => Math.max(acc, c.order + 1), 0)
  return prisma.component.create({
    data: {
      projectId,
      name: input.name,
      path: input.path,
      description: input.description,
      envEncrypted: input.envEncrypted as object,
      order: nextOrder,
    },
  })
}

export async function updateComponent(
  ownerId: string,
  projectId: string,
  id: string,
  input: ComponentCreateInput,
): Promise<Component | null> {
  const owned = await getComponentForOwner(ownerId, projectId, id)
  if (!owned) return null
  return prisma.component.update({
    where: { id },
    data: {
      name: input.name,
      path: input.path,
      description: input.description,
      envEncrypted: input.envEncrypted as object,
    },
  })
}

export async function deleteComponent(
  ownerId: string,
  projectId: string,
  id: string,
): Promise<boolean> {
  const owned = await getComponentForOwner(ownerId, projectId, id)
  if (!owned) return false
  await prisma.component.delete({ where: { id } })
  return true
}
