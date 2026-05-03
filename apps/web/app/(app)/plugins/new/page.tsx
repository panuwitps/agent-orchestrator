import { redirect } from 'next/navigation'
import { FormField } from '@/components/form-field'
import { tryJson } from '@/lib/form-utils'
import { createPluginAction } from '../actions'

export default function NewPluginPage() {
  async function submit(formData: FormData) {
    'use server'
    const res = await createPluginAction(null, {
      name: formData.get('name'),
      version: formData.get('version') || 'latest',
      source: formData.get('source') ?? 'claude_marketplace',
      config: tryJson(formData.get('config')),
    })
    if (res.ok) redirect('/plugins')
  }

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-semibold">New plugin</h1>
      <form action={submit} className="mt-6 space-y-4">
        <FormField label="Name" name="name" required placeholder="@some/plugin" />
        <FormField label="Version" name="version" defaultValue="latest" />
        <label className="block">
          <span className="block text-sm opacity-70">Source</span>
          <select name="source" defaultValue="claude_marketplace" className="mt-1 w-full rounded border border-white/10 bg-white/5 px-3 py-2">
            <option value="claude_marketplace">claude_marketplace</option>
            <option value="manual_path">manual_path</option>
          </select>
        </label>
        <FormField label="Config (JSON object)" name="config" placeholder='{"flag": true}' hint="Optional. Stored as-is." />
        <button className="rounded bg-emerald-600 px-3 py-2 font-medium hover:bg-emerald-500">Create</button>
      </form>
    </main>
  )
}
