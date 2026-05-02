import Link from 'next/link'
import { auth } from '@/lib/auth'
import { listPluginsForOwner } from '@ao/db'
import { DataTable, type Column } from '@/components/data-table'

type PluginRow = Awaited<ReturnType<typeof listPluginsForOwner>>[number]

const STATUS_STYLE: Record<string, string> = {
  pending: 'bg-amber-500/20 text-amber-300',
  installed: 'bg-emerald-500/20 text-emerald-300',
  failed: 'bg-red-500/20 text-red-300',
}

export default async function PluginsPage() {
  const session = await auth()
  const plugins = session?.user?.id ? await listPluginsForOwner(session.user.id) : []

  const columns: Column<PluginRow>[] = [
    { header: 'Name', cell: (p) => <span className="font-medium">{p.name}</span> },
    { header: 'Version', cell: (p) => <span className="opacity-70">{p.version}</span> },
    { header: 'Source', cell: (p) => <span className="opacity-60 text-xs">{p.source}</span> },
    {
      header: 'Status',
      cell: (p) => (
        <span className={`rounded px-2 py-0.5 text-xs ${STATUS_STYLE[p.installStatus] ?? 'bg-white/10 text-white/70'}`}>
          {p.installStatus}
        </span>
      ),
    },
  ]

  return (
    <main className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Plugins</h1>
        <Link href="/plugins/new" className="rounded bg-emerald-600 px-3 py-1.5 text-sm font-medium hover:bg-emerald-500">
          + New plugin
        </Link>
      </div>
      <DataTable
        rows={plugins}
        columns={columns}
        rowHref={(p) => `/plugins/${p.id}/edit` as never}
        rowKey={(p) => p.id}
        emptyMessage="No plugins yet. Phase 2 supports Claude marketplace + manual paths."
      />
    </main>
  )
}
