import { notFound, redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getPersonaForOwner, listRolesForOwner } from '@ao/db'
import { FormField, TextArea } from '@/components/form-field'
import { RolePicker } from '@/components/role-picker'
import { ConfirmDeleteButton } from '@/components/confirm-dialog'
import { updatePersonaAction, deletePersonaAction } from '../../actions'

export default async function EditPersonaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  const persona = await getPersonaForOwner(session.user.id, id)
  if (!persona) notFound()
  const roles = await listRolesForOwner(session.user.id)

  async function save(formData: FormData) {
    'use server'
    const avatarUrl = formData.get('avatarUrl')
    const defaultRoleId = formData.get('defaultRoleId')
    const res = await updatePersonaAction(null, id, {
      name: formData.get('name'),
      description: formData.get('description'),
      identityPrompt: formData.get('identityPrompt'),
      avatarUrl: typeof avatarUrl === 'string' && avatarUrl.length > 0 ? avatarUrl : null,
      roleIds: formData.getAll('roleIds').map(String),
      defaultRoleId: typeof defaultRoleId === 'string' && defaultRoleId.length > 0 ? defaultRoleId : null,
    })
    if (res.ok) redirect('/personas')
  }
  async function remove() { 'use server'; await deletePersonaAction(null, id); redirect('/personas') }

  const currentDefaultId = persona.roles.find((pr) => pr.isDefault)?.roleId ?? null

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-semibold">Edit persona</h1>
      <form action={save} className="mt-6 space-y-4">
        <FormField label="Name" name="name" required defaultValue={persona.name} />
        <FormField label="Description" name="description" required defaultValue={persona.description} />
        <TextArea label="Identity prompt" name="identityPrompt" required rows={10} defaultValue={persona.identityPrompt} />
        <FormField label="Avatar URL" name="avatarUrl" type="url" defaultValue={persona.avatarUrl ?? ''} />
        <RolePicker
          available={roles.map((r) => ({ id: r.id, name: r.name }))}
          selectedIds={persona.roles.map((pr) => pr.roleId)}
          defaultId={currentDefaultId}
          name="roleIds"
          defaultName="defaultRoleId"
        />
        <div className="flex items-center justify-between">
          <button className="rounded bg-emerald-600 px-3 py-2 font-medium hover:bg-emerald-500">Save</button>
          <ConfirmDeleteButton action={remove} />
        </div>
      </form>
    </main>
  )
}
