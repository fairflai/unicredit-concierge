import { z } from 'zod'

// Schema for chat requests - supports both string and multimodal array formats
const chatRequestSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(['user', 'assistant', 'system']),
      content: z.union([
        z.string().min(1).max(3500),
        z
          .array(
            z.object({
              type: z.string(),
              text: z.string().optional(),
            })
          )
          .min(1),
      ]),
    })
  ),
})

export type ValidationResult<T> =
  | { valid: true; data: T }
  | { valid: false; error: unknown }

export function validateChatRequest(
  body: unknown
): ValidationResult<z.infer<typeof chatRequestSchema>> {
  const result = chatRequestSchema.safeParse(body)
  if (!result.success) {
    return { valid: false, error: result.error }
  }
  return { valid: true, data: result.data }
}

export function sanitizeInput(input: string): string {
  // Basic sanitization to remove HTML tags and potential scripts
  return input
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .trim()
}

export function isBot(userAgent: string | null): boolean {
  if (!userAgent) return false
  const botPattern = /bot|crawler|spider|crawling/i
  return botPattern.test(userAgent)
}
