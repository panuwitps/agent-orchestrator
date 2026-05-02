export function tryJson(v: FormDataEntryValue | null): Record<string, unknown> {
  if (typeof v !== 'string' || v.trim() === '') return {}
  try {
    const parsed = JSON.parse(v)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

export function parseCsv(v: FormDataEntryValue | null): string[] {
  if (typeof v !== 'string') return []
  return v.split(',').map((s) => s.trim()).filter(Boolean)
}
