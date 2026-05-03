'use server'

import { existsSync } from 'node:fs'
import path from 'node:path'
import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import { ok, fail, type ActionResult } from '@/lib/action-result'
import {
  Prisma,
  createProject,
  updateProject,
  deleteProject,
  createComponent,
  updateComponent,
  deleteComponent,
} from '@ao/db'
import { ProjectInput, ComponentInput } from '@ao/shared'
import { encryptEnvMap } from '@/lib/crypto-server'

async function uid(): Promise<string | null> {
  const s = await auth()
  return s?.user?.id ?? null
}

export async function createProjectAction(callerId: string | null, raw: unknown): Promise<ActionResult<{ id: string }>> {
  const id = callerId ?? (await uid())
  if (!id) return fail('not authenticated')
  const parsed = ProjectInput.safeParse(raw)
  if (!parsed.success) return fail(parsed.error.errors[0]?.message ?? 'invalid input')
  try {
    const project = await createProject(id, parsed.data)
    revalidatePath('/projects')
    return ok({ id: project.id })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return fail('A project with this name already exists')
    }
    throw e
  }
}

export async function updateProjectAction(
  callerId: string | null,
  projectId: string,
  raw: unknown,
  archived = false,
): Promise<ActionResult<{ id: string }>> {
  const id = callerId ?? (await uid())
  if (!id) return fail('not authenticated')
  const parsed = ProjectInput.safeParse(raw)
  if (!parsed.success) return fail(parsed.error.errors[0]?.message ?? 'invalid input')
  try {
    const upd = await updateProject(id, projectId, { ...parsed.data, archived })
    if (!upd) return fail('not found')
    revalidatePath('/projects')
    revalidatePath(`/projects/${projectId}`)
    revalidatePath(`/projects/${projectId}/edit`)
    return ok({ id: upd.id })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return fail('A project with this name already exists')
    }
    throw e
  }
}

export async function deleteProjectAction(callerId: string | null, projectId: string): Promise<ActionResult<{ id: string }>> {
  const id = callerId ?? (await uid())
  if (!id) return fail('not authenticated')
  const ok2 = await deleteProject(id, projectId)
  if (!ok2) return fail('not found')
  revalidatePath('/projects')
  return ok({ id: projectId })
}

function validateComponentPath(p: string): string | null {
  if (!path.isAbsolute(p)) return 'component path must be absolute'
  if (!existsSync(p)) return 'path does not exist on disk'
  return null
}

export async function createComponentAction(
  callerId: string | null,
  projectId: string,
  raw: unknown,
): Promise<ActionResult<{ id: string }>> {
  const id = callerId ?? (await uid())
  if (!id) return fail('not authenticated')
  const parsed = ComponentInput.safeParse(raw)
  if (!parsed.success) return fail(parsed.error.errors[0]?.message ?? 'invalid input')
  const pathErr = validateComponentPath(parsed.data.path)
  if (pathErr) return fail(pathErr)
  try {
    const c = await createComponent(id, projectId, {
      name: parsed.data.name,
      path: parsed.data.path,
      description: parsed.data.description,
      envEncrypted: encryptEnvMap(parsed.data.env),
    })
    if (!c) return fail('not found')
    revalidatePath(`/projects/${projectId}`)
    return ok({ id: c.id })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return fail('A component with this name already exists in this project')
    }
    throw e
  }
}

export async function updateComponentAction(
  callerId: string | null,
  projectId: string,
  componentId: string,
  raw: unknown,
): Promise<ActionResult<{ id: string }>> {
  const id = callerId ?? (await uid())
  if (!id) return fail('not authenticated')
  const parsed = ComponentInput.safeParse(raw)
  if (!parsed.success) return fail(parsed.error.errors[0]?.message ?? 'invalid input')
  const pathErr = validateComponentPath(parsed.data.path)
  if (pathErr) return fail(pathErr)
  try {
    const c = await updateComponent(id, projectId, componentId, {
      name: parsed.data.name,
      path: parsed.data.path,
      description: parsed.data.description,
      envEncrypted: encryptEnvMap(parsed.data.env),
    })
    if (!c) return fail('not found')
    revalidatePath(`/projects/${projectId}`)
    revalidatePath(`/projects/${projectId}/components/${componentId}/edit`)
    return ok({ id: c.id })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return fail('A component with this name already exists in this project')
    }
    throw e
  }
}

export async function deleteComponentAction(
  callerId: string | null,
  projectId: string,
  componentId: string,
): Promise<ActionResult<{ id: string }>> {
  const id = callerId ?? (await uid())
  if (!id) return fail('not authenticated')
  const ok2 = await deleteComponent(id, projectId, componentId)
  if (!ok2) return fail('not found')
  revalidatePath(`/projects/${projectId}`)
  return ok({ id: componentId })
}
