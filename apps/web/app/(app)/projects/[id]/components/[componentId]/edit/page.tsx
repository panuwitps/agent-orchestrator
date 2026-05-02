import { notFound, redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getComponentForOwner } from '@ao/db'
import { FormField, TextArea } from '@/components/form-field'
import { ConfirmDeleteButton } from '@/components/confirm-dialog'
import { parseEnvLines, formatEnvKeys } from '@/lib/env-format'
import { updateComponentAction, deleteComponentAction } from '../../../../actions'

export default async function EditComponentPage({
  params,
}: {
  params: Promise<{ id: string; componentId: string }>
}) {
  const { id: projectId, componentId } = await params
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  const component = await getComponentForOwner(session.user.id, projectId, componentId)
  if (!component) notFound()

  async function save(formData: FormData) {
    'use server'
    const res = await updateComponentAction(null, projectId, componentId, {
      name: formData.get('name'),
      path: formData.get('path'),
      description: formData.get('description'),
      env: parseEnvLines(formData.get('env')),
    })
    if (res.ok) redirect(`/projects/${projectId}`)
  }
  async function remove() {
    'use server'
    await deleteComponentAction(null, projectId, componentId)
    redirect(`/projects/${projectId}`)
  }

  const envKeys = formatEnvKeys((component.envEncrypted ?? {}) as Record<string, unknown>)

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-semibold">Edit component</h1>
      <form action={save} className="mt-6 space-y-4">
        <FormField label="Name" name="name" required defaultValue={component.name} />
        <FormField label="Absolute path" name="path" required defaultValue={component.path} />
        <TextArea label="Description" name="description" rows={4} required defaultValue={component.description} />
        <TextArea
          label="Env (KEY=VALUE per line)"
          name="env"
          rows={6}
          defaultValue={envKeys}
          hint="Existing values are encrypted and not re-displayed. Re-enter values to update; remove a line to delete the key."
        />
        <div className="flex items-center justify-between">
          <button className="rounded bg-emerald-600 px-3 py-2 font-medium hover:bg-emerald-500">Save</button>
          <ConfirmDeleteButton action={remove} />
        </div>
      </form>
    </main>
  )
}
