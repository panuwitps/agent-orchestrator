import { notFound, redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getProjectForOwner } from '@ao/db'
import { FormField, TextArea } from '@/components/form-field'
import { ConfirmDeleteButton } from '@/components/confirm-dialog'
import { updateProjectAction, deleteProjectAction } from '../../actions'

export default async function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  const project = await getProjectForOwner(session.user.id, id)
  if (!project) notFound()

  async function save(formData: FormData) {
    'use server'
    const archived = formData.get('archived') === 'on'
    const res = await updateProjectAction(
      null,
      id,
      {
        name: formData.get('name'),
        description: formData.get('description'),
      },
      archived,
    )
    if (res.ok) redirect(`/projects/${id}`)
  }
  async function remove() { 'use server'; await deleteProjectAction(null, id); redirect('/projects') }

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-semibold">Edit project</h1>
      <form action={save} className="mt-6 space-y-4">
        <FormField label="Name" name="name" required defaultValue={project.name} />
        <TextArea label="Description" name="description" rows={4} required defaultValue={project.description} />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="archived" defaultChecked={project.archived} />
          Archived
        </label>
        <div className="flex items-center justify-between">
          <button className="rounded bg-emerald-600 px-3 py-2 font-medium hover:bg-emerald-500">Save</button>
          <ConfirmDeleteButton action={remove} />
        </div>
      </form>
    </main>
  )
}
