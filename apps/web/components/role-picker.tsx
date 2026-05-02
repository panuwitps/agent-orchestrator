'use client'
import { useState } from 'react'

export function RolePicker({
  available,
  selectedIds: initial,
  defaultId,
  name,
  defaultName,
}: {
  available: { id: string; name: string }[]
  selectedIds: string[]
  defaultId?: string | null
  name: string
  defaultName: string
}) {
  const [picked, setPicked] = useState(new Set(initial))
  const [defaultRoleId, setDefaultRoleId] = useState<string | null>(defaultId ?? null)
  const toggle = (id: string) => {
    const next = new Set(picked)
    if (next.has(id)) {
      next.delete(id)
      if (defaultRoleId === id) setDefaultRoleId(null)
    } else {
      next.add(id)
    }
    setPicked(next)
  }
  return (
    <div>
      <span className="block text-sm opacity-70">Roles</span>
      <div className="mt-2 space-y-1 rounded border border-white/10 p-3 max-h-72 overflow-auto">
        {available.length === 0 ? (
          <p className="text-xs opacity-50">No roles yet — create one first.</p>
        ) : (
          available.map((r) => (
            <label key={r.id} className="flex items-center gap-2 rounded px-2 py-1 hover:bg-white/5">
              <input type="checkbox" checked={picked.has(r.id)} onChange={() => toggle(r.id)} />
              <span className="text-sm flex-1">{r.name}</span>
              <button
                type="button"
                disabled={!picked.has(r.id)}
                onClick={() => setDefaultRoleId(defaultRoleId === r.id ? null : r.id)}
                className={`rounded border px-2 py-0.5 text-xs ${
                  defaultRoleId === r.id
                    ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300'
                    : 'border-white/10 opacity-50 hover:opacity-90 disabled:opacity-20'
                }`}
              >
                {defaultRoleId === r.id ? 'default' : 'set default'}
              </button>
            </label>
          ))
        )}
      </div>
      {[...picked].map((id) => (
        <input key={id} type="hidden" name={name} value={id} />
      ))}
      {defaultRoleId && <input type="hidden" name={defaultName} value={defaultRoleId} />}
    </div>
  )
}
