import Link from 'next/link'
import type { Route } from 'next'

const NAV: ({ href: Route; label: string } | { type: 'divider' })[] = [
  { href: '/', label: 'Home' },
  { href: '/projects', label: 'Projects' },
  { href: '/tickets', label: 'Tickets' },
  { type: 'divider' },
  { href: '/personas', label: 'Personas' },
  { href: '/roles', label: 'Roles' },
  { href: '/skills', label: 'Skills' },
  { href: '/plugins', label: 'Plugins' },
  { href: '/mcp', label: 'MCP Servers' },
  { type: 'divider' },
  { href: '/settings', label: 'Settings' },
]

export function Sidebar() {
  return (
    <aside className="flex h-screen w-56 shrink-0 flex-col gap-1 border-r border-white/10 bg-black/20 p-3">
      <div className="px-2 py-3 text-sm font-semibold tracking-wider">AGENT-ORCH</div>
      {NAV.map((item, i) =>
        'type' in item ? (
          <div key={i} className="my-2 h-px bg-white/10" />
        ) : (
          <Link
            key={item.href}
            href={item.href}
            className="rounded px-2 py-1.5 text-sm hover:bg-white/5"
          >
            {item.label}
          </Link>
        ),
      )}
    </aside>
  )
}
