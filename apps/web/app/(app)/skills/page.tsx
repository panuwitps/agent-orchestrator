import Link from 'next/link'
import { auth } from '@/lib/auth'
import { listSkillsForOwner } from '@ao/db'
import { DataTable, type Column } from '@/components/data-table'
import type { Skill } from '@ao/db'

export default async function SkillsPage() {
  const session = await auth()
  const skills = session?.user?.id ? await listSkillsForOwner(session.user.id) : []

  const columns: Column<Skill>[] = [
    { header: 'Name', cell: (s) => <span className="font-medium">{s.name}</span> },
    { header: 'Description', cell: (s) => <span className="opacity-80">{s.description}</span> },
    {
      header: 'Providers',
      cell: (s) => (
        <span className="opacity-60 text-xs">
          {s.compatibleProviders.length > 0 ? s.compatibleProviders.join(', ') : '—'}
        </span>
      ),
    },
  ]

  return (
    <main className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Skills</h1>
        <Link
          href="/skills/new"
          className="rounded bg-emerald-600 px-3 py-1.5 text-sm font-medium hover:bg-emerald-500"
        >
          + New skill
        </Link>
      </div>
      <DataTable
        rows={skills}
        columns={columns}
        rowHref={(s) => `/skills/${s.id}/edit` as never}
        rowKey={(s) => s.id}
        emptyMessage="No skills yet. Create your first to teach a role a behavior."
      />
    </main>
  )
}
