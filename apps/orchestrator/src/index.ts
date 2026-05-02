import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { healthz } from './routes/healthz'
import { internalAuth } from './middleware/internal-auth'

const app = new Hono()

app.route('/healthz', healthz)

// Internal-only namespace (will host /dispatch, /tickets/:id/* in later phases)
const internal = new Hono()
internal.use('*', internalAuth)
internal.get('/ping', (c) => c.json({ ok: true }))
app.route('/internal', internal)

const port = Number(process.env.ORCHESTRATOR_PORT ?? 4000)
serve({ fetch: app.fetch, port })
console.log(`[orchestrator] listening on :${port}`)
