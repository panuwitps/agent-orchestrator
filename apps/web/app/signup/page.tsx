import { redirect } from 'next/navigation'
import { resolveAuthMode, isSignupAllowed } from '@/lib/auth-mode'
import { prisma } from '@/lib/prisma'
import { signupAction } from './actions'

export default async function SignupPage() {
  const mode = resolveAuthMode()
  const count = await prisma.user.count()
  if (!isSignupAllowed(mode, count)) redirect('/login')

  async function submit(formData: FormData) {
    'use server'
    const res = await signupAction({
      email: formData.get('email'),
      password: formData.get('password'),
      name: formData.get('name') || undefined,
    })
    if (res.ok) redirect('/login?signedup=1')
  }

  return (
    <main className="mx-auto mt-24 max-w-sm space-y-6 p-6">
      <h1 className="text-xl font-semibold">Create the first owner account</h1>
      <form action={submit} className="space-y-3">
        <input
          name="name"
          placeholder="Name (optional)"
          className="w-full rounded border border-white/10 bg-white/5 px-3 py-2"
        />
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
          minLength={8}
          placeholder="Password (min 8)"
          className="w-full rounded border border-white/10 bg-white/5 px-3 py-2"
        />
        <button className="w-full rounded bg-emerald-600 px-3 py-2 font-medium hover:bg-emerald-500">
          Create account
        </button>
      </form>
    </main>
  )
}
