import Link from 'next/link'
import { auth } from '@/lib/auth'
import { listMcpServersForOwner } from '@ao/db'
import { DataTable, type Column } from '@/components/data-table'

type McpRow = Awaited<ReturnType<typeof listMcpServersForOwner>>[number]

export default async function McpPage() {
  const session = await auth()
  const servers = session?.user?.id ? await listMcpServersForOwner(session.user.id) : []

  const columns: Column<McpRow>[] = [
    { header: 'Name', cell: (m) => <span className="font-medium">{m.name}</span> },
    { header: 'Transport', cell: (m) => <span className="opacity-70">{m.transport}</span> },
    {
      header: 'Endpoint',
      cell: (m) => <span className="opacity-60 text-xs">{m.transport === 'stdio' ? (m.command ?? '—') : (m.url ?? '—')}</span>,
    },
  ]

  return (
    <main className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">MCP servers</h1>
        <Link href="/mcp/new" className="rounded bg-emerald-600 px-3 py-1.5 text-sm font-medium hover:bg-emerald-500">
          + New MCP server
        </Link>
      </div>
      <DataTable
        rows={servers}
        columns={columns}
        rowHref={(m) => `/mcp/${m.id}/edit` as never}
        rowKey={(m) => m.id}
        emptyMessage="No MCP servers yet."
      />
    </main>
  )
}
