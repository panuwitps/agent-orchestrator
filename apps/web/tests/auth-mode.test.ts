import { describe, it, expect, afterEach, vi } from 'vitest'
import { resolveAuthMode, isSignupAllowed } from '../lib/auth-mode'

describe('auth-mode', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('defaults to local when env unset', () => {
    // AUTH_MODE=local in .env, which is the expected default
    vi.stubEnv('AUTH_MODE', 'local')
    expect(resolveAuthMode()).toBe('local')
  })

  it('respects AUTH_MODE=team', () => {
    vi.stubEnv('AUTH_MODE', 'team')
    expect(resolveAuthMode()).toBe('team')
  })

  it('throws on unknown mode', () => {
    vi.stubEnv('AUTH_MODE', 'nope')
    expect(() => resolveAuthMode()).toThrow()
  })

  it('local: allows signup when no users exist', () => {
    expect(isSignupAllowed('local', 0)).toBe(true)
  })

  it('local: disallows signup once any user exists', () => {
    expect(isSignupAllowed('local', 1)).toBe(false)
  })

  it('none: never allows signup (auto-login implied)', () => {
    expect(isSignupAllowed('none', 0)).toBe(false)
  })

  it('team: signup is invite-only and not via /signup form', () => {
    expect(isSignupAllowed('team', 0)).toBe(false)
  })
})
