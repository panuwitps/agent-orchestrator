import { LoginForm } from './login-form'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ signedup?: string }>
}) {
  const sp = await searchParams
  return (
    <main className="mx-auto mt-24 max-w-sm space-y-6 p-6">
      <h1 className="text-xl font-semibold">Sign in</h1>
      <LoginForm banner={sp.signedup === '1' ? 'Account created. Sign in.' : undefined} />
    </main>
  )
}
