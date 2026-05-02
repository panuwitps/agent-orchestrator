'use client'

import { signIn } from 'next-auth/react'
import { useState } from 'react'

export function LoginForm({ banner }: { banner?: string }) {
  const [error, setError] = useState<string | null>(null)
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault()
        setError(null)
        const fd = new FormData(e.currentTarget)
        const res = await signIn('credentials', {
          email: fd.get('email'),
          password: fd.get('password'),
          redirect: true,
          redirectTo: '/',
        })
        if (res?.error) setError('Invalid email or password')
      }}
      className="space-y-3"
    >
      {banner && <p className="rounded bg-emerald-500/15 px-3 py-2 text-sm text-emerald-300">{banner}</p>}
      <input
        name="email"
        type="email"
        required
        placeholder="Email"
        className="w-full rounded border border-white/10 bg-white/5 px-3 py-2"
      />
      <input
        name="password"
        type="password"
        required
        placeholder="Password"
        className="w-full rounded border border-white/10 bg-white/5 px-3 py-2"
      />
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button className="w-full rounded bg-emerald-600 px-3 py-2 font-medium hover:bg-emerald-500">
        Sign in
      </button>
    </form>
  )
}
