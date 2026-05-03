import { redirect } from 'next/navigation'
import { FormField, TextArea } from '@/components/form-field'
import { parseCsv } from '@/lib/form-utils'
import { parseEnvLines } from '@/lib/env-format'
import { createMcpServerAction } from '../actions'

export default function NewMcpServerPage() {
  async function submit(formData: FormData) {
    'use server'
    const transport = String(formData.get('transport') ?? 'stdio')
    const command = formData.get('command')
    const url = formData.get('url')
    const res = await createMcpServerAction(null, {
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

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-semibold">New MCP server</h1>
      <form action={submit} className="mt-6 space-y-4">
        <FormField label="Name" name="name" required placeholder="github" />
        <FormField label="Description" name="description" required />
        <label className="block">
          <span className="block text-sm opacity-70">Transport</span>
          <select name="transport" defaultValue="stdio" className="mt-1 w-full rounded border border-white/10 bg-white/5 px-3 py-2">
            {['stdio', 'http', 'sse'].map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <FormField label="Command (stdio)" name="command" placeholder="/usr/local/bin/mcp-server" hint="Required for transport=stdio." />
        <FormField label="URL (http/sse)" name="url" type="url" placeholder="https://..." hint="Required for transport=http or sse." />
        <FormField label="Args (comma separated)" name="args" placeholder="--port,8080" />
        <TextArea
          label="Env (KEY=VALUE per line)"
          name="env"
          rows={6}
          placeholder={'GITHUB_TOKEN=ghp_xxx\nDEBUG=1'}
          hint="Values are encrypted at rest with AES-256-GCM."
        />
        <FormField label="Compatible providers (comma separated)" name="compatibleProviders" placeholder="claude, codex, gemini" />
        <button className="rounded bg-emerald-600 px-3 py-2 font-medium hover:bg-emerald-500">Create</button>
      </form>
    </main>
  )
}
