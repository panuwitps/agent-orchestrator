import { notFound, redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getPluginForOwner } from '@ao/db'
import { FormField } from '@/components/form-field'
import { ConfirmDeleteButton } from '@/components/confirm-dialog'
import { tryJson } from '@/lib/form-utils'
import { updatePluginAction, deletePluginAction, installPluginAction } from '../../actions'

const STATUS_STYLE: Record<string, string> = {
  pending: 'bg-amber-500/20 text-amber-300',
  installed: 'bg-emerald-500/20 text-emerald-300',
  failed: 'bg-red-500/20 text-red-300',
}

export default async function EditPluginPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  const plugin = await getPluginForOwner(session.user.id, id)
  if (!plugin) notFound()

  async function save(formData: FormData) {
    'use server'
    const res = await updatePluginAction(null, id, {
      name: formData.get('name'),
      version: formData.get('version') || 'latest',
      source: formData.get('source') ?? 'claude_marketplace',
      config: tryJson(formData.get('config')),
    })
    if (res.ok) redirect('/plugins')
  }
  async function install() {
    'use server'
    await installPluginAction(null, id)
  }
  async function remove() { 'use server'; await deletePluginAction(null, id); redirect('/plugins') }

  return (
    <main className="mx-auto max-w-2xl p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Edit plugin</h1>
        <span className={`rounded px-2 py-0.5 text-xs ${STATUS_STYLE[plugin.installStatus] ?? 'bg-white/10 text-white/70'}`}>
          {plugin.installStatus}
        </span>
      </div>
      <form action={save} className="mt-6 space-y-4">
        <FormField label="Name" name="name" required defaultValue={plugin.name} />
        <FormField label="Version" name="version" defaultValue={plugin.version} />
        <label className="block">
          <span className="block text-sm opacity-70">Source</span>
          <select name="source" defaultValue={plugin.source} className="mt-1 w-full rounded border border-white/10 bg-white/5 px-3 py-2">
            <option value="claude_marketplace">claude_marketplace</option>
            <option value="manual_path">manual_path</option>
          </select>
        </label>
        <FormField label="Config (JSON object)" name="config" defaultValue={JSON.stringify(plugin.config, null, 2)} />
        <div className="flex items-center justify-between">
          <button className="rounded bg-emerald-600 px-3 py-2 font-medium hover:bg-emerald-500">Save</button>
          <ConfirmDeleteButton action={remove} />
        </div>
      </form>
      {plugin.installStatus !== 'installed' && (
        <form action={install} className="mt-6">
          <button className="rounded border border-emerald-500/40 px-3 py-2 text-sm hover:bg-emerald-500/10">
            Install plugin
          </button>
          <p className="mt-1 text-xs opacity-50">
            Phase 2 mocks the install — runs no shell command, just flips status to installed after a short delay.
          </p>
        </form>
      )}
    </main>
  )
}
