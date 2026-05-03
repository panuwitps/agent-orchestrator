import Link from 'next/link'
import { auth } from '@/lib/auth'
import { listPersonasForOwner } from '@ao/db'
import { DataTable, type Column } from '@/components/data-table'

type PersonaRow = Awaited<ReturnType<typeof listPersonasForOwner>>[number]

export default async function PersonasPage() {
  const session = await auth()
  const personas = session?.user?.id ? await listPersonasForOwner(session.user.id) : []

  const columns: Column<PersonaRow>[] = [
    { header: 'Name', cell: (p) => <span className="font-medium">{p.name}</span> },
    { header: 'Description', cell: (p) => <span className="opacity-80">{p.description}</span> },
    { header: 'Roles', cell: (p) => <span className="opacity-60 text-xs">{p.roles.length}</span> },
  ]

  return (
    <main className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Personas</h1>
        <Link
          href="/personas/new"
          className="rounded bg-emerald-600 px-3 py-1.5 text-sm font-medium hover:bg-emerald-500"
        >
          + New persona
        </Link>
      </div>
      <DataTable
        rows={personas}
        columns={columns}
        rowHref={(p) => `/personas/${p.id}/edit` as never}
        rowKey={(p) => p.id}
        emptyMessage="No personas yet."
      />
    </main>
  )
}
