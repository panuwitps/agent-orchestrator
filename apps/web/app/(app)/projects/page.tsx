import Link from 'next/link'
import { auth } from '@/lib/auth'
import { listProjectsForOwner } from '@ao/db'
import { DataTable, type Column } from '@/components/data-table'

type ProjectRow = Awaited<ReturnType<typeof listProjectsForOwner>>[number]

export default async function ProjectsPage() {
  const session = await auth()
  const projects = session?.user?.id ? await listProjectsForOwner(session.user.id) : []

  const columns: Column<ProjectRow>[] = [
    { header: 'Name', cell: (p) => <span className="font-medium">{p.name}</span> },
    { header: 'Description', cell: (p) => <span className="opacity-80">{p.description}</span> },
    {
      header: 'Status',
      cell: (p) =>
        p.archived ? (
          <span className="rounded bg-amber-500/20 px-2 py-0.5 text-xs text-amber-300">archived</span>
        ) : (
          <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-300">active</span>
        ),
    },
  ]

  return (
    <main className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Projects</h1>
        <Link href="/projects/new" className="rounded bg-emerald-600 px-3 py-1.5 text-sm font-medium hover:bg-emerald-500">
          + New project
        </Link>
      </div>
      <DataTable
        rows={projects}
        columns={columns}
        rowHref={(p) => `/projects/${p.id}` as never}
        rowKey={(p) => p.id}
        emptyMessage="No projects yet. Create one to start orchestrating."
      />
    </main>
  )
}
