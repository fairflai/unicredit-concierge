import { createOpenAI } from '@ai-sdk/openai'
import { streamText } from 'ai'
import { SYSTEM_PROMPT } from './SYSTEM_PROMPT'
import { verifySession } from '@/lib/security/access-control'
import { checkRateLimit } from '@/lib/security/rate-limiter'
import {
  validateChatRequest,
  isBot,
  sanitizeInput,
} from '@/lib/security/request-validator'

const openrouter = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
  compatibility: 'compatible',
})

// Allow streaming responses up to 30 seconds
export const maxDuration = 30

export async function POST(req: Request) {
  // 1. Bot Detection
  const userAgent = req.headers.get('user-agent')
  if (isBot(userAgent)) {
    console.warn(`Bot detected: ${userAgent}`)
    // We don't block immediately to avoid false positives, but we could.
    // For now, just logging as per requirements "Suspicious activity is logged".
  }

  // 2. Session Verification
  const sessionId = req.headers.get('x-session-id')
  if (!verifySession(sessionId)) {
    return Response.json(
      { error: 'Unauthorized: Invalid or missing session ID.' },
      { status: 401 }
    )
  }

  // 3. Rate Limiting (Session-based: 10 req/min)
  // We use the sessionId as the identifier
  if (!checkRateLimit(`session:${sessionId}`, 10, 60000)) {
    return Response.json(
      { error: 'Too Many Requests' },
      {
        status: 429,
        headers: { 'Retry-After': '60' },
      }
    )
  }

  const body = await req.json()

  // 4. Request Validation
  const validation = validateChatRequest(body)
  if (!validation.valid) {
    return Response.json(
      { error: 'Invalid request', details: validation.error },
      { status: 400 }
    )
  }

  const { messages } = validation.data

  // 5. Sanitization
  const sanitizedMessages = messages.map(msg => ({
    ...msg,
    content: sanitizeInput(msg.content),
  }))

  const result = streamText({
    model: openrouter('openai/gpt-5-mini'),
    messages: sanitizedMessages,
    system: SYSTEM_PROMPT,
  })

  return result.toDataStreamResponse()
}
