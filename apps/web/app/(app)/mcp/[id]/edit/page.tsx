import { notFound, redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getMcpServerForOwner } from '@ao/db'
import { FormField, TextArea } from '@/components/form-field'
import { ConfirmDeleteButton } from '@/components/confirm-dialog'
import { parseCsv } from '@/lib/form-utils'
import { parseEnvLines, formatEnvKeys } from '@/lib/env-format'
import { updateMcpServerAction, deleteMcpServerAction } from '../../actions'

export default async function EditMcpServerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  const server = await getMcpServerForOwner(session.user.id, id)
  if (!server) notFound()

  async function save(formData: FormData) {
    'use server'
    const transport = String(formData.get('transport') ?? 'stdio')
    const command = formData.get('command')
    const url = formData.get('url')
    const res = await updateMcpServerAction(null, id, {
      name: formData.get('name'),
      description: formData.get('description'),
      transport,
      command: typeof command === 'string' && command.length > 0 ? command : null,
      args: parseCsv(formData.get('args')),
      url: typeof url === 'string' && url.length > 0 ? url : null,
      env: parseEnvLines(formData.get('env')),
      compatibleProviders: parseCsv(formData.get('compatibleProviders')),
    })
    if (res.ok) redirect('/mcp')
  }
  async function remove() { 'use server'; await deleteMcpServerAction(null, id); redirect('/mcp') }

  const envKeys = formatEnvKeys((server.envEncrypted ?? {}) as Record<string, unknown>)

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-semibold">Edit MCP server</h1>
      <form action={save} className="mt-6 space-y-4">
        <FormField label="Name" name="name" required defaultValue={server.name} />
        <FormField label="Description" name="description" required defaultValue={server.description} />
        <label className="block">
          <span className="block text-sm opacity-70">Transport</span>
          <select name="transport" defaultValue={server.transport} className="mt-1 w-full rounded border border-white/10 bg-white/5 px-3 py-2">
            {['stdio', 'http', 'sse'].map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <FormField label="Command (stdio)" name="command" defaultValue={server.command ?? ''} />
        <FormField label="URL (http/sse)" name="url" type="url" defaultValue={server.url ?? ''} />
        <FormField label="Args (comma separated)" name="args" defaultValue={server.args.join(', ')} />
        <TextArea
          label="Env (KEY=VALUE per line)"
          name="env"
          rows={6}
          defaultValue={envKeys}
          hint="Existing values are encrypted and not re-displayed. Re-enter values to update; remove a line to delete the key."
        />
        <FormField
          label="Compatible providers (comma separated)"
          name="compatibleProviders"
          defaultValue={server.compatibleProviders.join(', ')}
        />
        <div className="flex items-center justify-between">
          <button className="rounded bg-emerald-600 px-3 py-2 font-medium hover:bg-emerald-500">Save</button>
          <ConfirmDeleteButton action={remove} />
        </div>
      </form>
    </main>
  )
}
