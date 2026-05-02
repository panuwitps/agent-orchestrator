import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

export interface EncryptedRecord {
  ciphertext: string  // base64
  iv: string          // base64 (12 bytes)
  tag: string         // base64 (16 bytes)
  keyVersion: number
}

export function deriveKey(secretBase64: string): Buffer {
  const key = Buffer.from(secretBase64, 'base64')
  if (key.length !== 32) {
    throw new Error('SECRET_KEY must decode to 32 bytes (use openssl rand -base64 32)')
  }
  return key
}

export function encrypt(plaintext: string, key: Buffer, keyVersion = 1): EncryptedRecord {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return {
    ciphertext: ciphertext.toString('base64'),
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    keyVersion,
  }
}

export function decrypt(record: EncryptedRecord, key: Buffer): string {
  const iv = Buffer.from(record.iv, 'base64')
  const tag = Buffer.from(record.tag, 'base64')
  const ciphertext = Buffer.from(record.ciphertext, 'base64')
  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()])
  return plaintext.toString('utf8')
}
