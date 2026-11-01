// Verifies how we call the Gemini SDK (request shape, retries, error mapping) with the SDK
// mocked. A live call needs GEMINI_API_KEY and is checked manually.
import { ApiError } from '@google/genai'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const generateContent = vi.fn()
vi.mock('@google/genai', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@google/genai')>()),
  GoogleGenAI: class {
    models = { generateContent }
  },
}))

const { createGeminiProvider } = await import('./gemini.ts')
const provider = createGeminiProvider({ apiKey: 'test', model: 'gemini-test', timeoutMs: 1000 })
const request = { system: 'rules', prompt: 'plan please', schema: { type: 'object' }, maxOutputTokens: 512 }

beforeEach(() => {
  generateContent.mockReset()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('Gemini provider', () => {
  it('requests JSON matching the schema, with the rules as the system instruction and a timeout', async () => {
    generateContent.mockResolvedValue({ text: '{"ok":true}' })
    await expect(provider.generateJson(request)).resolves.toEqual({ ok: true })
    const call = generateContent.mock.calls[0][0]
    expect(call).toMatchObject({
      model: 'gemini-test',
      contents: 'plan please',
      config: { systemInstruction: 'rules', responseMimeType: 'application/json', responseJsonSchema: { type: 'object' }, maxOutputTokens: 512 },
    })
    expect(call.config.abortSignal).toBeInstanceOf(AbortSignal)
  })

  it('retries once on a transient provider error', async () => {
    generateContent.mockRejectedValueOnce(new ApiError({ message: 'overloaded', status: 503 })).mockResolvedValueOnce({ text: '{"ok":1}' })
    await expect(provider.generateJson(request)).resolves.toEqual({ ok: 1 })
    expect(generateContent).toHaveBeenCalledTimes(2)
  })

  it('does not retry client errors and reports the provider as unavailable', async () => {
    generateContent.mockRejectedValue(new ApiError({ message: 'bad key', status: 400 }))
    await expect(provider.generateJson(request)).rejects.toMatchObject({ kind: 'unavailable' })
    expect(generateContent).toHaveBeenCalledTimes(1)
  })

  it('maps an aborted request to a timeout', async () => {
    generateContent.mockRejectedValue(Object.assign(new Error('aborted'), { name: 'AbortError' }))
    await expect(provider.generateJson(request)).rejects.toMatchObject({ kind: 'timeout' })
  })

  it.each([
    ['malformed JSON', { text: '{"summary": "cut off' }],
    ['an empty response', { text: '' }],
  ])('treats %s as invalid output', async (_label, response) => {
    generateContent.mockResolvedValue(response)
    await expect(provider.generateJson(request)).rejects.toMatchObject({ kind: 'invalid_output' })
  })
})
