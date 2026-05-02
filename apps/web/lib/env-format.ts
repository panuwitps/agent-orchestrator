export function parseEnvLines(input: FormDataEntryValue | null): Record<string, string> {
  if (typeof input !== 'string') return {}
  const out: Record<string, string> = {}
  for (const raw of input.split('\n')) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq <= 0) continue
    const key = line.slice(0, eq).trim()
    const value = line.slice(eq + 1)
    if (key) out[key] = value
  }
  return out
}

export function formatEnvKeys(record: Record<string, unknown>): string {
  return Object.keys(record)
    .sort()
    .map((k) => `${k}=`)
    .join('\n')
}
