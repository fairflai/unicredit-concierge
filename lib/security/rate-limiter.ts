interface RateLimitRecord {
  count: number
  startTime: number
}

const rateLimits = new Map<string, RateLimitRecord>()

export function checkRateLimit(
  identifier: string,
  limit: number,
  windowMs: number
): boolean {
  const now = Date.now()
  const record = rateLimits.get(identifier)

  if (!record) {
    rateLimits.set(identifier, { count: 1, startTime: now })
    return true
  }

  if (now - record.startTime > windowMs) {
    // Window expired, reset
    rateLimits.set(identifier, { count: 1, startTime: now })
    return true
  }

  if (record.count >= limit) {
    return false
  }

  record.count++
  return true
}

// Cleanup old records periodically to prevent memory leaks
setInterval(() => {
  const now = Date.now()
  for (const [key, record] of rateLimits.entries()) {
    if (now - record.startTime > 60000) {
      // Cleanup after 1 minute (assuming max window is usually 1 min)
      rateLimits.delete(key)
    }
  }
}, 60000)
