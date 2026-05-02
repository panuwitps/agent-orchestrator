import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getProjectForOwner } from '@ao/db'
import { DataTable, type Column } from '@/components/data-table'

type ComponentRow = NonNullable<Awaited<ReturnType<typeof getProjectForOwner>>>['components'][number]

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  const project = await getProjectForOwner(session.user.id, id)
  if (!project) notFound()

  const componentColumns: Column<ComponentRow>[] = [
    { header: 'Name', cell: (c) => <span className="font-medium">{c.name}</span> },
    { header: 'Path', cell: (c) => <span className="font-mono text-xs opacity-70">{c.path}</span> },
    { header: 'Description', cell: (c) => <span className="opacity-80">{c.description}</span> },
  ]

  return (
    <main className="p-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{project.name}</h1>
          <p className="mt-1 max-w-2xl text-sm opacity-70">{project.description}</p>
          {project.archived && (
            <span className="mt-2 inline-block rounded bg-amber-500/20 px-2 py-0.5 text-xs text-amber-300">archived</span>
          )}
        </div>
        <Link
          href={`/projects/${project.id}/edit` as never}
          className="rounded border border-white/10 px-3 py-1.5 text-sm hover:bg-white/5"
        >
          Edit project
        </Link>
      </div>

      <nav className="mt-8 flex gap-6 border-b border-white/10 text-sm">
        <span className="-mb-px border-b-2 border-emerald-400 pb-2 font-medium">Components</span>
        <span className="pb-2 opacity-50">Tickets <span className="text-xs">(Phase 3)</span></span>
        <span className="pb-2 opacity-50">Members <span className="text-xs">(Team mode)</span></span>
        <Link href={`/projects/${project.id}/edit` as never} className="pb-2 opacity-70 hover:opacity-100">Settings</Link>
      </nav>

      <section className="mt-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-medium">Components</h2>
          <Link
            href={`/projects/${project.id}/components/new` as never}
            className="rounded bg-emerald-600 px-3 py-1.5 text-sm font-medium hover:bg-emerald-500"
          >
            + New component
          </Link>
        </div>
        <DataTable
          rows={project.components}
          columns={componentColumns}
          rowHref={(c) => `/projects/${project.id}/components/${c.id}/edit` as never}
          rowKey={(c) => c.id}
          emptyMessage="No components yet. Add one to wire up a working directory."
        />
      </section>
    </main>
  )
}
