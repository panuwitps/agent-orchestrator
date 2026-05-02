export type AuthMode = 'none' | 'local' | 'team'

export function resolveAuthMode(): AuthMode {
  const raw = (process.env.AUTH_MODE ?? 'local').toLowerCase()
  if (raw === 'none' || raw === 'local' || raw === 'team') return raw
  throw new Error(`Invalid AUTH_MODE: ${raw}`)
}

export function isSignupAllowed(mode: AuthMode, existingUserCount: number): boolean {
  if (mode === 'local') return existingUserCount === 0
  return false
}
