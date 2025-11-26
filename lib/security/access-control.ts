import { createHmac } from 'crypto'

// Stateless session implementation to support serverless/stateless environments
const ACCESS_CODE = process.env.ACCESS_CODE || 'UNICREDIT2025'
const SECRET_KEY =
  process.env.SESSION_SECRET || 'kopernicana-cards-secret-key-2025'

export function verifySession(sessionId: string | null): boolean {
  if (!sessionId || !sessionId.includes('.')) return false

  const [base64Payload, signature] = sessionId.split('.')
  if (!base64Payload || !signature) return false

  // Verify signature
  const expectedSignature = createHmac('sha256', SECRET_KEY)
    .update(base64Payload)
    .digest('hex')

  if (signature !== expectedSignature) return false

  // Check expiration (24 hours)
  try {
    const payload = JSON.parse(Buffer.from(base64Payload, 'base64').toString())
    const now = Date.now()
    const maxAge = 24 * 60 * 60 * 1000 // 24 hours
    if (now - payload.createdAt > maxAge) return false

    return true
  } catch {
    return false
  }
}

export function createSession(): string {
  const payload = JSON.stringify({
    id: crypto.randomUUID(),
    createdAt: Date.now(),
  })
  const base64Payload = Buffer.from(payload).toString('base64')
  const signature = createHmac('sha256', SECRET_KEY)
    .update(base64Payload)
    .digest('hex')

  return `${base64Payload}.${signature}`
}

export function validateAccessCode(code: string): boolean {
  return code === ACCESS_CODE
}

export function invalidateSession(sessionId: string): void {
  // Stateless sessions cannot be invalidated server-side without a blacklist/database.
  // For this use case, client-side removal is sufficient.
}
