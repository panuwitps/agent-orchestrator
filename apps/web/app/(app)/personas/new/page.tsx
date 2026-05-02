import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { listRolesForOwner } from '@ao/db'
import { FormField, TextArea } from '@/components/form-field'
import { RolePicker } from '@/components/role-picker'
import { createPersonaAction } from '../actions'

export default async function NewPersonaPage() {
  const session = await auth()
  const roles = session?.user?.id ? await listRolesForOwner(session.user.id) : []

  async function submit(formData: FormData) {
    'use server'
    const avatarUrl = formData.get('avatarUrl')
    const defaultRoleId = formData.get('defaultRoleId')
    const res = await createPersonaAction(null, {
      name: formData.get('name'),
      description: formData.get('description'),
      identityPrompt: formData.get('identityPrompt'),
      avatarUrl: typeof avatarUrl === 'string' && avatarUrl.length > 0 ? avatarUrl : null,
      roleIds: formData.getAll('roleIds').map(String),
      defaultRoleId: typeof defaultRoleId === 'string' && defaultRoleId.length > 0 ? defaultRoleId : null,
    })
    if (res.ok) redirect('/personas')
  }

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-semibold">New persona</h1>
      <form action={submit} className="mt-6 space-y-4">
        <FormField label="Name" name="name" required placeholder="Senior backend engineer" />
        <FormField label="Description" name="description" required />
        <TextArea label="Identity prompt" name="identityPrompt" required rows={10} />
        <FormField label="Avatar URL" name="avatarUrl" type="url" placeholder="https://..." />
        <RolePicker
          available={roles.map((r) => ({ id: r.id, name: r.name }))}
          selectedIds={[]}
          defaultId={null}
          name="roleIds"
          defaultName="defaultRoleId"
        />
        <button className="rounded bg-emerald-600 px-3 py-2 font-medium hover:bg-emerald-500">Create</button>
      </form>
    </main>
  )
}
