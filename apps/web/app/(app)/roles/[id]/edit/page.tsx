import { notFound, redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getRoleForOwner, listSkillsForOwner } from '@ao/db'
import { FormField, TextArea } from '@/components/form-field'
import { SkillPicker } from '@/components/skill-picker'
import { ConfirmDeleteButton } from '@/components/confirm-dialog'
import { updateRoleAction, deleteRoleAction } from '../../actions'

export default async function EditRolePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  const role = await getRoleForOwner(session.user.id, id)
  if (!role) notFound()
  const skills = await listSkillsForOwner(session.user.id)

  async function save(formData: FormData) {
    'use server'
    const res = await updateRoleAction(null, id, {
      name: formData.get('name'),
      description: formData.get('description'),
      systemPrompt: formData.get('systemPrompt'),
      defaultEffort: formData.get('defaultEffort') ?? 'high',
      toolPermissions: {
        read: formData.get('read') === 'on',
        edit: formData.get('edit') === 'on',
        bash: formData.get('bash') === 'on',
        webFetch: formData.get('webFetch') === 'on',
      },
      skillIds: formData.getAll('skillIds').map(String),
    })
    if (res.ok) redirect('/roles')
  }
  async function remove() { 'use server'; await deleteRoleAction(null, id); redirect('/roles') }

  const tp = role.toolPermissions as { read: boolean; edit: boolean; bash: boolean; webFetch: boolean }

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-semibold">Edit role</h1>
      <form action={save} className="mt-6 space-y-4">
        <FormField label="Name" name="name" required defaultValue={role.name} />
        <FormField label="Description" name="description" required defaultValue={role.description} />
        <TextArea label="System prompt" name="systemPrompt" required rows={10} defaultValue={role.systemPrompt} />
        <label className="block">
          <span className="block text-sm opacity-70">Default effort</span>
          <select name="defaultEffort" defaultValue={role.defaultEffort.toLowerCase()} className="mt-1 w-full rounded border border-white/10 bg-white/5 px-3 py-2">
            {['low', 'medium', 'high', 'max'].map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
        </label>
        <fieldset className="rounded border border-white/10 p-3">
          <legend className="px-2 text-sm opacity-70">Tool permissions</legend>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {(['read', 'edit', 'bash', 'webFetch'] as const).map((k) => (
              <label key={k} className="flex items-center gap-2">
                <input type="checkbox" name={k} defaultChecked={tp[k]} />
                {k}
              </label>
            ))}
          </div>
        </fieldset>
        <SkillPicker
          available={skills.map((s) => ({ id: s.id, name: s.name }))}
          selectedIds={role.skills.map((rs) => rs.skillId)}
          name="skillIds"
        />
        <div className="flex items-center justify-between">
          <button className="rounded bg-emerald-600 px-3 py-2 font-medium hover:bg-emerald-500">Save</button>
          <ConfirmDeleteButton action={remove} />
        </div>
      </form>
    </main>
  )
}
