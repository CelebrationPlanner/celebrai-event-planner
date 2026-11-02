import Anthropic from '@anthropic-ai/sdk'
import { AiError, type AIProvider } from './provider.ts'

// Structured outputs accept a JSON Schema subset: every object closed, no numeric/length/item-count
// limits. Those limits are still enforced by Zod on the response.
const SUPPORTED = new Set([
  'type',
  'properties',
  'required',
  'items',
  'enum',
  'const',
  'anyOf',
  'allOf',
  'description',
  'format',
])

/** Standard JSON Schema → the dialect Claude structured outputs accept. */
export function toClaudeSchema(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(toClaudeSchema)
  if (node === null || typeof node !== 'object') return node
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(node)) {
    if (key === 'properties')
      out[key] = Object.fromEntries(Object.entries(value as object).map(([k, v]) => [k, toClaudeSchema(v)]))
    else if (SUPPORTED.has(key)) out[key] = toClaudeSchema(value)
  }
  if (out.type === 'object') out.additionalProperties = false
  // Zod writes nullable primitives as `type: ["string", "null"]`; use the documented anyOf form.
  if (Array.isArray(out.type)) {
    const { type, description, ...rest } = out
    return {
      ...(description ? { description } : {}),
      anyOf: (type as string[]).map((t) => (t === 'null' ? { type: 'null' } : { ...rest, type: t })),
    }
  }
  return out
}

// Adaptive thinking is always on for this model and shares max_tokens with the visible answer.
const THINKING_HEADROOM = 8_000

/**
 * Claude implementation of AIProvider: structured JSON output, medium effort, server-side
 * fallback when a safety classifier declines, one SDK retry on transient errors, and an
 * overall deadline that covers retries.
 */
export function createClaudeProvider(options: { apiKey: string; model: string; timeoutMs: number }): AIProvider {
  const client = new Anthropic({ apiKey: options.apiKey, timeout: options.timeoutMs, maxRetries: 1 })

  return {
    name: `claude:${options.model}`,
    async generateJson(request) {
      let response
      try {
        response = await client.beta.messages.create(
          {
            model: options.model,
            max_tokens: request.maxOutputTokens + THINKING_HEADROOM,
            system: request.system,
            messages: [{ role: 'user', content: request.prompt }],
            output_config: {
              effort: 'medium',
              format: { type: 'json_schema', schema: toClaudeSchema(request.schema) as Record<string, unknown> },
            },
            betas: ['server-side-fallback-2026-07-01'],
            fallbacks: 'default',
          },
          { signal: AbortSignal.timeout(options.timeoutMs) },
        )
      } catch (err) {
        if (err instanceof Anthropic.APIConnectionTimeoutError || err instanceof Anthropic.APIUserAbortError)
          throw new AiError('timeout', 'The AI provider timed out.')
        // Log the status only; provider messages can echo request content.
        console.error(
          `AI provider error${err instanceof Anthropic.APIError && err.status ? ` (HTTP ${err.status})` : ''}`,
        )
        throw new AiError('unavailable', 'The AI provider is unavailable.')
      }

      if (response.stop_reason === 'refusal')
        throw new AiError('invalid_output', 'The AI provider declined the request.')
      if (response.stop_reason === 'max_tokens')
        throw new AiError('invalid_output', 'The AI provider response was truncated.')
      const text = response.content.find((block) => block.type === 'text')?.text
      if (!text) throw new AiError('invalid_output', 'The AI provider returned no text.')
      try {
        return JSON.parse(text)
      } catch {
        throw new AiError('invalid_output', 'The AI provider returned malformed JSON.')
      }
    },
  }
}
