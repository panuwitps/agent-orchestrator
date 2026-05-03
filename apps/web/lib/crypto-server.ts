import { encrypt, decrypt, deriveKey, type EncryptedRecord } from '@ao/shared/crypto'

let cachedKey: Buffer | null = null

function key(): Buffer {
  if (cachedKey) return cachedKey
  const secret = process.env.SECRET_KEY
  if (!secret) throw new Error('SECRET_KEY is not configured')
  cachedKey = deriveKey(secret)
  return cachedKey
}

export function encryptEnvMap(plaintext: Record<string, string>): Record<string, EncryptedRecord> {
  const k = key()
  const out: Record<string, EncryptedRecord> = {}
  for (const [name, value] of Object.entries(plaintext)) {
    out[name] = encrypt(value, k)
  }
  return out
}

export function decryptEnvValue(record: EncryptedRecord): string {
  return decrypt(record, key())
}
