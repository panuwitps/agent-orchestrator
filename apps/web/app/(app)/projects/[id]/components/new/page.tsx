import { notFound, redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getProjectForOwner } from '@ao/db'
import { FormField, TextArea } from '@/components/form-field'
import { parseEnvLines } from '@/lib/env-format'
import { createComponentAction } from '../../../actions'

export default async function NewComponentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await params
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  const project = await getProjectForOwner(session.user.id, projectId)
  if (!project) notFound()

  async function submit(formData: FormData) {
    'use server'
    const res = await createComponentAction(null, projectId, {
      name: formData.get('name'),
      path: formData.get('path'),
      description: formData.get('description'),
      env: parseEnvLines(formData.get('env')),
    })
    if (res.ok) redirect(`/projects/${projectId}`)
  }

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-semibold">New component for {project.name}</h1>
      <form action={submit} className="mt-6 space-y-4">
        <FormField label="Name" name="name" required placeholder="api" />
        <FormField label="Absolute path" name="path" required placeholder="/Users/me/workspace/api" hint="Must be an absolute path that exists on disk." />
        <TextArea label="Description" name="description" rows={4} required />
        <TextArea
          label="Env (KEY=VALUE per line)"
          name="env"
          rows={6}
          placeholder={'DATABASE_URL=postgres://...'}
          hint="Values are encrypted at rest with AES-256-GCM."
        />
        <button className="rounded bg-emerald-600 px-3 py-2 font-medium hover:bg-emerald-500">Create</button>
      </form>
    </main>
  )
}
