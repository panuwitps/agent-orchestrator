'use client'

import { Command } from 'cmdk'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Route } from 'next'

const ROUTES: { label: string; path: Route }[] = [
  { label: 'Home', path: '/' },
  { label: 'Projects', path: '/projects' },
  { label: 'Tickets', path: '/tickets' },
  { label: 'Personas', path: '/personas' },
  { label: 'Roles', path: '/roles' },
  { label: 'Skills', path: '/skills' },
  { label: 'Plugins', path: '/plugins' },
  { label: 'MCP Servers', path: '/mcp' },
  { label: 'Settings', path: '/settings' },
]

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Command Palette"
      className="fixed inset-0 grid place-items-start pt-32"
    >
      <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
      <div className="relative mx-auto w-[480px] rounded-lg border border-white/10 bg-[#1a1a1d] shadow-xl">
        <Command.Input
          placeholder="Type a command…"
          className="w-full bg-transparent px-4 py-3 outline-none"
        />
        <Command.List className="max-h-72 overflow-auto p-1">
          <Command.Empty className="px-3 py-2 text-sm opacity-50">No results.</Command.Empty>
          {ROUTES.map((r) => (
            <Command.Item
              key={r.path}
              onSelect={() => {
                setOpen(false)
                router.push(r.path)
              }}
              className="cursor-pointer rounded px-3 py-2 text-sm aria-selected:bg-white/10"
            >
              Go to {r.label}
            </Command.Item>
          ))}
        </Command.List>
      </div>
    </Command.Dialog>
  )
}
