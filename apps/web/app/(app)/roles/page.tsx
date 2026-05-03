import Link from 'next/link'
import { auth } from '@/lib/auth'
import { listRolesForOwner } from '@ao/db'
import { DataTable, type Column } from '@/components/data-table'

type RoleRow = Awaited<ReturnType<typeof listRolesForOwner>>[number]

export default async function RolesPage() {
  const session = await auth()
  const roles = session?.user?.id ? await listRolesForOwner(session.user.id) : []

  const columns: Column<RoleRow>[] = [
    { header: 'Name', cell: (r) => <span className="font-medium">{r.name}</span> },
    { header: 'Effort', cell: (r) => <span className="opacity-70">{r.defaultEffort.toLowerCase()}</span> },
    {
      header: 'Skills',
      cell: (r) => <span className="opacity-60 text-xs">{r.skills.length}</span>,
    },
  ]

  return (
    <main className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Roles</h1>
        <Link href="/roles/new" className="rounded bg-emerald-600 px-3 py-1.5 text-sm font-medium hover:bg-emerald-500">
          + New role
        </Link>
      </div>
      <DataTable
        rows={roles}
        columns={columns}
        rowHref={(r) => `/roles/${r.id}/edit` as never}
        rowKey={(r) => r.id}
        emptyMessage="No roles yet."
      />
    </main>
  )
}
