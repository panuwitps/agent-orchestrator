const base = process.env.ORCHESTRATOR_URL ?? 'http://localhost:4000'
const token = process.env.INTERNAL_API_TOKEN

export type OrchestratorResponse<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; error: string }

export async function callOrchestrator<T>(path: string, init: RequestInit = {}): Promise<OrchestratorResponse<T>> {
  if (!token) return { ok: false, status: 500, error: 'INTERNAL_API_TOKEN not configured' }
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      'x-internal-token': token,
      ...(init.headers ?? {}),
    },
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    return { ok: false, status: res.status, error: body || `${res.status}` }
  }
  return { ok: true, data: (await res.json()) as T }
}
