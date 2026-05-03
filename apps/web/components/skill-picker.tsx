'use client'
import { useState } from 'react'

export function SkillPicker({
  available,
  selectedIds: initial,
  name,
}: {
  available: { id: string; name: string }[]
  selectedIds: string[]
  name: string
}) {
  const [picked, setPicked] = useState(new Set(initial))
  const toggle = (id: string) => {
    const next = new Set(picked)
    next.has(id) ? next.delete(id) : next.add(id)
    setPicked(next)
  }
  return (
    <div>
      <span className="block text-sm opacity-70">Skills</span>
      <div className="mt-2 space-y-1 rounded border border-white/10 p-3 max-h-72 overflow-auto">
        {available.length === 0 ? (
          <p className="text-xs opacity-50">No skills yet — create one first.</p>
        ) : (
          available.map((s) => (
            <label key={s.id} className="flex items-center gap-2 rounded px-2 py-1 hover:bg-white/5">
              <input
                type="checkbox"
                checked={picked.has(s.id)}
                onChange={() => toggle(s.id)}
              />
              <span className="text-sm">{s.name}</span>
            </label>
          ))
        )}
      </div>
      {[...picked].map((id) => (
        <input key={id} type="hidden" name={name} value={id} />
      ))}
    </div>
  )
}
