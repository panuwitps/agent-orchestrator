import type { MiddlewareHandler } from 'hono'

export const internalAuth: MiddlewareHandler = async (c, next) => {
  const expected = process.env.INTERNAL_API_TOKEN
  if (!expected) return c.json({ error: 'INTERNAL_API_TOKEN not configured' }, 500)
  const got = c.req.header('x-internal-token')
  if (got !== expected) return c.json({ error: 'unauthorized' }, 401)
  return next()
}
