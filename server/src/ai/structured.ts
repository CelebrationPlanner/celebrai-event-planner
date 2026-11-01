import { z } from 'zod'
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

/** Zod schema → the JSON Schema we send to the model. Dropped keywords are still enforced by Zod afterwards. */
export function toProviderSchema(schema: z.ZodType): object {
  return prune(z.toJSONSchema(schema, { io: 'input' })) as object
}

/**
 * Calls the provider with a response schema, then validates the result with Zod. Anything
 * that doesn't match — wrong shape, out-of-range values, non-JSON — is rejected (Scenario 8).
 */
export async function generateStructured<S extends z.ZodType>(
  provider: AIProvider,
  request: { system: string; prompt: string; schema: S; maxOutputTokens: number },
): Promise<z.infer<S>> {
  const raw = await provider.generateJson({ system: request.system, prompt: request.prompt, schema: toProviderSchema(request.schema), maxOutputTokens: request.maxOutputTokens })
  const parsed = request.schema.safeParse(raw)
  if (!parsed.success) throw new AiError('invalid_output', `Model output failed validation at ${parsed.error.issues[0]?.path.join('.') || 'root'}`)
  return parsed.data
}
