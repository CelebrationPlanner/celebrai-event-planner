import { z } from 'zod'
import { AiError, type AIProvider } from './provider.ts'

/**
 * Calls the provider with a response schema, then validates the result with Zod. Anything
 * that doesn't match — wrong shape, out-of-range values, non-JSON — is rejected (Scenario 8).
 */
export async function generateStructured<S extends z.ZodType>(
  provider: AIProvider,
  request: { system: string; prompt: string; schema: S; maxOutputTokens: number },
): Promise<z.infer<S>> {
  // Each provider adapts this standard JSON Schema to its own dialect; Zod re-checks everything afterwards.
  const schema = z.toJSONSchema(request.schema, { io: 'input' })
  const raw = await provider.generateJson({ system: request.system, prompt: request.prompt, schema, maxOutputTokens: request.maxOutputTokens })
  const parsed = request.schema.safeParse(raw)
  if (!parsed.success) throw new AiError('invalid_output', `Model output failed validation at ${parsed.error.issues[0]?.path.join('.') || 'root'}`)
  return parsed.data
}
