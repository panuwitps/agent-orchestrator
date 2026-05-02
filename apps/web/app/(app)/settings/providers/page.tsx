import { prisma } from '@ao/db'

export default async function ProvidersSettings() {
  const providers = await prisma.provider.findMany({ orderBy: { slug: 'asc' } })
  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold">Providers</h1>
      <p className="mt-2 text-sm opacity-70">
        Subscription-backed CLI providers. Models and effort levels are stored as catalog metadata.
      </p>
      <div className="mt-6 space-y-4">
        {providers.map((p) => {
          const models = (p.models as { id: string; name: string; effortLevels: string[] }[]) ?? []
          return (
            <section key={p.id} className="rounded border border-white/10 p-4">
              <header className="flex items-center justify-between">
                <h2 className="text-lg font-medium">{p.name}</h2>
                <span className="text-xs opacity-50">{p.cliCommand}</span>
              </header>
              <div className="mt-2 flex gap-3 text-xs">
                {p.supportsSkills && <span className="rounded bg-emerald-500/15 px-2 py-0.5 text-emerald-300">skills</span>}
                {p.supportsPlugins && <span className="rounded bg-violet-500/15 px-2 py-0.5 text-violet-300">plugins</span>}
                {p.supportsMcp && <span className="rounded bg-sky-500/15 px-2 py-0.5 text-sky-300">mcp</span>}
              </div>
              <table className="mt-3 w-full text-sm">
                <thead><tr className="text-left opacity-60"><th className="py-1">Model</th><th className="py-1">Effort levels</th></tr></thead>
                <tbody>
                  {models.map((m) => (
                    <tr key={m.id} className="border-t border-white/5">
                      <td className="py-1">{m.name}</td>
                      <td className="py-1 opacity-70">{m.effortLevels.join(', ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )
        })}
      </div>
    </main>
  )
}
