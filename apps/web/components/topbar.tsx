import { signOut } from '@/lib/auth'

export function Topbar({ email }: { email?: string | null }) {
  return (
    <header className="flex items-center justify-end gap-3 border-b border-white/10 px-4 py-2">
      <span className="text-sm opacity-70">{email}</span>
      <form
        action={async () => {
          'use server'
          await signOut({ redirectTo: '/login' })
        }}
      >
        <button className="rounded border border-white/10 px-2 py-1 text-xs hover:bg-white/5">
          Sign out
        </button>
      </form>
    </header>
  )
}
