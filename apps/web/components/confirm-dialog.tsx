'use client'
import { useState } from 'react'

export function ConfirmDeleteButton({
  action,
  label = 'Delete',
  confirm = 'Are you sure?',
}: {
  action: (formData: FormData) => void
  label?: string
  confirm?: string
}) {
  const [armed, setArmed] = useState(false)
  if (!armed) {
    return (
      <button
        type="button"
        onClick={() => setArmed(true)}
        className="rounded border border-red-500/30 px-3 py-1.5 text-sm text-red-300 hover:bg-red-500/10"
      >
        {label}
      </button>
    )
  }
  return (
    <form action={action} className="flex items-center gap-2">
      <span className="text-sm text-red-300">{confirm}</span>
      <button
        type="submit"
        className="rounded bg-red-500/30 px-3 py-1.5 text-sm font-medium hover:bg-red-500/40"
      >
        Confirm
      </button>
      <button
        type="button"
        onClick={() => setArmed(false)}
        className="rounded border border-white/10 px-3 py-1.5 text-sm hover:bg-white/5"
      >
        Cancel
      </button>
    </form>
  )
}
