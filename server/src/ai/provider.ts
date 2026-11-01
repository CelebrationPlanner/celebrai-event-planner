/**
 * Provider-neutral AI boundary. Business logic depends on this interface only, never on a
 * vendor SDK; swapping Gemini for another model means writing one more implementation.
 */
export interface AIProvider {
  readonly name: string
  /** Returns the model's parsed JSON. The caller validates it — never trust the shape. */
  generateJson(request: { system: string; prompt: string; schema: object; maxOutputTokens: number }): Promise<unknown>
}

export type AiErrorKind = 'unavailable' | 'timeout' | 'invalid_output'

export class AiError extends Error {
  readonly kind: AiErrorKind

  constructor(kind: AiErrorKind, message: string) {
    super(message)
    this.kind = kind
  }
}

/** Used when no API key is configured: the app still runs, AI routes answer 503. */
export const unconfiguredProvider: AIProvider = {
  name: 'none',
  generateJson: async () => {
    throw new AiError('unavailable', 'No API key is configured for the selected AI provider.')
  },
}
