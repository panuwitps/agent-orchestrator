import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { listSkillsForOwner } from '@ao/db'
import { FormField, TextArea } from '@/components/form-field'
import { SkillPicker } from '@/components/skill-picker'
import { createRoleAction } from '../actions'

export default async function NewRolePage() {
  const session = await auth()
  const skills = session?.user?.id ? await listSkillsForOwner(session.user.id) : []

  async function submit(formData: FormData) {
    'use server'
    const res = await createRoleAction(null, {
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

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-semibold">New role</h1>
      <form action={submit} className="mt-6 space-y-4">
        <FormField label="Name" name="name" required placeholder="Backend Dev" />
        <FormField label="Description" name="description" required />
        <TextArea label="System prompt" name="systemPrompt" required rows={10} />
        <label className="block">
          <span className="block text-sm opacity-70">Default effort</span>
          <select name="defaultEffort" defaultValue="high" className="mt-1 w-full rounded border border-white/10 bg-white/5 px-3 py-2">
            {['low', 'medium', 'high', 'max'].map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
        </label>
        <fieldset className="rounded border border-white/10 p-3">
          <legend className="px-2 text-sm opacity-70">Tool permissions</legend>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {(['read', 'edit', 'bash', 'webFetch'] as const).map((k) => (
              <label key={k} className="flex items-center gap-2">
                <input type="checkbox" name={k} defaultChecked />
                {k}
              </label>
            ))}
          </div>
        </fieldset>
        <SkillPicker available={skills.map((s) => ({ id: s.id, name: s.name }))} selectedIds={[]} name="skillIds" />
        <button className="rounded bg-emerald-600 px-3 py-2 font-medium hover:bg-emerald-500">Create</button>
      </form>
    </main>
  )
}
