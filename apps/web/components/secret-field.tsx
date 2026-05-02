'use client'
import { useState } from 'react'

export function SecretField({
  label,
  name,
  defaultValue,
  hint,
}: {
  label: string
  name: string
  defaultValue?: string
  hint?: string
}) {
  const [reveal, setReveal] = useState(false)
  return (
    <label className="block">
      <span className="block text-sm opacity-70">{label}</span>
      <div className="mt-1 flex">
        <input
          name={name}
          type={reveal ? 'text' : 'password'}
          defaultValue={defaultValue}
          className="flex-1 rounded-l border border-white/10 bg-white/5 px-3 py-2"
        />
        <button
          type="button"
          onClick={() => setReveal((v) => !v)}
          className="rounded-r border border-l-0 border-white/10 bg-white/5 px-3 text-xs hover:bg-white/10"
        >
          {reveal ? 'hide' : 'reveal'}
        </button>
      </div>
      {hint && <span className="mt-1 block text-xs opacity-50">{hint}</span>}
    </label>
  )
}
