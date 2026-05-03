'use client'
import { useState, useTransition } from 'react'

export function ConfirmDeleteButton({
  action,
  label = 'Delete',
  confirm = 'Are you sure?',
}: {
  // Called with no args; the edit pages capture the entity id in closure.
  // We invoke it directly (not via a form) so this component is safe to nest
  // inside another <form> without producing invalid HTML.
  action: () => void | Promise<void>
  label?: string
  confirm?: string
}) {
  const [armed, setArmed] = useState(false)
  const [pending, startTransition] = useTransition()

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
    <span className="flex items-center gap-2">
      <span className="text-sm text-red-300">{confirm}</span>
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(() => Promise.resolve(action()))}
        className="rounded bg-red-500/30 px-3 py-1.5 text-sm font-medium hover:bg-red-500/40 disabled:opacity-50"
      >
        {pending ? 'Deleting…' : 'Confirm'}
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => setArmed(false)}
        className="rounded border border-white/10 px-3 py-1.5 text-sm hover:bg-white/5 disabled:opacity-50"
      >
        Cancel
      </button>
    </span>
  )
}
