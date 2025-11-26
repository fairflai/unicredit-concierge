import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { checkRateLimit } from './lib/security/rate-limiter'

export function middleware(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || '127.0.0.1'
  console.log(`Request from IP: ${ip}`)

  // 1. IP-based Rate Limiting (20 req/min)
  const isAllowed = checkRateLimit(`ip:${ip}`, 20, 60000)

  if (!isAllowed) {
    return new NextResponse('Too Many Requests', {
      status: 429,
      headers: {
        'Retry-After': '60',
      },
    })
  }

  const response = NextResponse.next()

  // 2. Security Headers
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  return response
}

export const config = {
  matcher: '/api/:path*',
}
