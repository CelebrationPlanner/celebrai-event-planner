import { ApiError, GoogleGenAI } from '@google/genai'
import { AiError, type AIProvider } from './provider.ts'

// The JSON Schema subset Gemini's responseJsonSchema accepts (see @google/genai typings).
const SUPPORTED = new Set(['type', 'format', 'title', 'description', 'enum', 'items', 'prefixItems', 'minItems', 'maxItems', 'minimum', 'maximum', 'anyOf', 'oneOf', 'properties', 'additionalProperties', 'required'])

function prune(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(prune)
  if (node === null || typeof node !== 'object') return node
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(node)) {
    if (key === 'properties') out[key] = Object.fromEntries(Object.entries(value as object).map(([k, v]) => [k, prune(v)]))
    else if (SUPPORTED.has(key)) out[key] = prune(value)
  }
  return out
}

/** Standard JSON Schema → the subset Gemini accepts. Dropped keywords are still enforced by Zod afterwards. */
export const toGeminiSchema = (schema: object) => prune(schema) as object

const isTransient = (err: unknown) => err instanceof ApiError && (err.status === 429 || err.status >= 500)

/** Gemini implementation of AIProvider: JSON mode, bounded output, timeout, one retry on transient errors. */
export function createGeminiProvider(options: { apiKey: string; model: string; timeoutMs: number }): AIProvider {
  const client = new GoogleGenAI({ apiKey: options.apiKey })

  async function call(request: Parameters<AIProvider['generateJson']>[0]) {
    const response = await client.models.generateContent({
      model: options.model,
      contents: request.prompt,
      config: {
        systemInstruction: request.system,
        responseMimeType: 'application/json',
        responseJsonSchema: toGeminiSchema(request.schema),
        maxOutputTokens: request.maxOutputTokens,
        temperature: 0.7,
        abortSignal: AbortSignal.timeout(options.timeoutMs),
      },
    })
    return response.text
  }

  return {
    name: `gemini:${options.model}`,
    async generateJson(request) {
      let text: string | undefined
      try {
        text = await call(request).catch((err) => (isTransient(err) ? call(request) : Promise.reject(err)))
      } catch (err) {
        if (err instanceof Error && (err.name === 'AbortError' || err.name === 'TimeoutError')) throw new AiError('timeout', 'The AI provider timed out.')
        // Log the status only; provider messages can echo request content.
        console.error(`AI provider error${err instanceof ApiError ? ` (HTTP ${err.status})` : ''}`)
        throw new AiError('unavailable', 'The AI provider is unavailable.')
      }
      if (!text) throw new AiError('invalid_output', 'The AI provider returned an empty response.')
      try {
        return JSON.parse(text)
      } catch {
        throw new AiError('invalid_output', 'The AI provider returned malformed JSON.')
      }
    },
  }
}
