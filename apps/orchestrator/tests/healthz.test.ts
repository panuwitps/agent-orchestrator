import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { Hono } from 'hono'
import { healthz } from '../src/routes/healthz'
import { internalAuth } from '../src/middleware/internal-auth'

describe('healthz', () => {
  it('returns ok', async () => {
    const app = new Hono().route('/healthz', healthz)
    const res = await app.request('/healthz')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true, service: 'orchestrator' })
  })
})

describe('internalAuth', () => {
  beforeEach(() => {
    vi.stubEnv('INTERNAL_API_TOKEN', 'secret')
  })
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('rejects missing token', async () => {
    const app = new Hono()
    app.use('*', internalAuth)
    app.get('/x', (c) => c.text('ok'))
    const res = await app.request('/x')
    expect(res.status).toBe(401)
  })

  it('accepts correct token', async () => {
    const app = new Hono()
    app.use('*', internalAuth)
    app.get('/x', (c) => c.text('ok'))
    const res = await app.request('/x', { headers: { 'x-internal-token': 'secret' } })
    expect(res.status).toBe(200)
  })
})
