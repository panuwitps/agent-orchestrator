import { describe, it, expect } from 'vitest'
import { encrypt, decrypt, deriveKey } from '../src/crypto'

const KEY_B64 = Buffer.alloc(32, 7).toString('base64')

describe('crypto AES-256-GCM', () => {
  it('roundtrips a plaintext', () => {
    const key = deriveKey(KEY_B64)
    const enc = encrypt('hello world', key)
    expect(enc.ciphertext).not.toContain('hello')
    expect(decrypt(enc, key)).toBe('hello world')
  })

  it('produces different ciphertext for same plaintext (random IV)', () => {
    const key = deriveKey(KEY_B64)
    const a = encrypt('same', key)
    const b = encrypt('same', key)
    expect(a.ciphertext).not.toBe(b.ciphertext)
    expect(a.iv).not.toBe(b.iv)
  })

  it('fails to decrypt if tag is tampered', () => {
    const key = deriveKey(KEY_B64)
    const enc = encrypt('payload', key)
    const tampered = { ...enc, tag: Buffer.alloc(16, 0).toString('base64') }
    expect(() => decrypt(tampered, key)).toThrow()
  })

  it('rejects an invalid key length', () => {
    expect(() => deriveKey(Buffer.alloc(16).toString('base64'))).toThrow(/32 bytes/)
  })
})
