import { ApiError, GoogleGenAI } from '@google/genai'
import { AiError, type AIProvider } from './provider.ts'

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
        responseJsonSchema: request.schema,
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
