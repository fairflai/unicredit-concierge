import { NextResponse } from 'next/server'
import {
  validateAccessCode,
  createSession,
} from '@/lib/security/access-control'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { code } = body

    if (!code || !validateAccessCode(code)) {
      return NextResponse.json(
        { error: 'Invalid access code' },
        { status: 401 }
      )
    }

    const sessionId = createSession()
    return NextResponse.json({ sessionId })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
