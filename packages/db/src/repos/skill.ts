import { prisma } from '../index'
import type { Skill } from '@prisma/client'

export type SkillCreateInput = {
  name: string
  description: string
  content: string
  frontmatter: Record<string, unknown>
  compatibleProviders: string[]
}

export async function listSkillsForOwner(ownerId: string): Promise<Skill[]> {
  return prisma.skill.findMany({
    where: { ownerId },
    orderBy: { name: 'asc' },
  })
}

export async function getSkillForOwner(ownerId: string, id: string): Promise<Skill | null> {
  return prisma.skill.findFirst({ where: { id, ownerId } })
}

export async function createSkill(ownerId: string, input: SkillCreateInput): Promise<Skill> {
  return prisma.skill.create({
    data: {
      ownerId,
      name: input.name,
      description: input.description,
      content: input.content,
      frontmatter: input.frontmatter as object,
      compatibleProviders: input.compatibleProviders,
    },
  })
}

export async function updateSkill(
  ownerId: string,
  id: string,
  input: SkillCreateInput,
): Promise<Skill | null> {
  const existing = await getSkillForOwner(ownerId, id)
  if (!existing) return null
  return prisma.skill.update({
    where: { id },
    data: {
      name: input.name,
      description: input.description,
      content: input.content,
      frontmatter: input.frontmatter as object,
      compatibleProviders: input.compatibleProviders,
    },
  })
}

export async function deleteSkill(ownerId: string, id: string): Promise<boolean> {
  const existing = await getSkillForOwner(ownerId, id)
  if (!existing) return false
  await prisma.skill.delete({ where: { id } })
  return true
}
