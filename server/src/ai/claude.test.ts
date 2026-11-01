// Verifies how we call the Anthropic SDK (request shape, schema dialect, stop reasons, error
// mapping) with the SDK mocked. A live call needs ANTHROPIC_API_KEY and is checked manually.
import Anthropic from '@anthropic-ai/sdk'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

const create = vi.fn()
vi.mock('@anthropic-ai/sdk', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@anthropic-ai/sdk')>()
  class MockAnthropic extends actual.default {
    constructor(...args: ConstructorParameters<typeof actual.default>) {
      super(...args)
      Object.assign(this, { beta: { messages: { create } } })
    }
  }
  return { ...actual, default: MockAnthropic }
})

const { createClaudeProvider, toClaudeSchema } = await import('./claude.ts')
const provider = createClaudeProvider({ apiKey: 'test', model: 'claude-opus-5-5', timeoutMs: 1000 })
const schema = z.toJSONSchema(
  z.object({ title: z.string().max(10), items: z.array(z.object({ n: z.number().int().min(0) })).min(1).max(3), note: z.string().nullable() }),
  { io: 'input' },
)
const request = { system: 'rules', prompt: 'plan please', schema, maxOutputTokens: 512 }
const reply = (text: string, extra: object = {}) => ({
  stop_reason: 'end_turn',
  content: [{ type: 'thinking', thinking: '', signature: 's' }, { type: 'text', text }],
  ...extra,
})

beforeEach(() => {
  create.mockReset()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('toClaudeSchema', () => {
  it('closes every object and drops constraints structured outputs do not support', () => {
    const out = toClaudeSchema(schema) as { additionalProperties: boolean; properties: Record<string, { items?: { additionalProperties: boolean } }> }
    const text = JSON.stringify(out)
    expect(out.additionalProperties).toBe(false)
    expect(out.properties.items.items?.additionalProperties).toBe(false)
    expect(text).not.toMatch(/maxLength|minItems|maxItems|minimum|\$schema/)
    expect(text).toContain('"anyOf"') // nullable fields survive, in the documented anyOf form
    expect(text).not.toContain('["string","null"]')
  })
})

describe('Claude provider', () => {
  it('requests JSON in the Claude schema dialect, with server-side refusal fallback and a deadline', async () => {
    create.mockResolvedValue(reply('{"ok":true}'))
    await expect(provider.generateJson(request)).resolves.toEqual({ ok: true })
    const [body, options] = create.mock.calls[0]
    expect(body).toMatchObject({
      model: 'claude-opus-5-5',
      system: 'rules',
      messages: [{ role: 'user', content: 'plan please' }],
      output_config: { effort: 'medium', format: { type: 'json_schema', schema: toClaudeSchema(schema) } },
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
    })
    expect(body.max_tokens).toBeGreaterThan(512) // headroom: thinking shares the token budget
    expect(options.signal).toBeInstanceOf(AbortSignal)
  })

  it('reads the text block and ignores thinking blocks', async () => {
    create.mockResolvedValue(reply('{"summary":"Party"}'))
    await expect(provider.generateJson(request)).resolves.toEqual({ summary: 'Party' })
  })

  it.each([
    ['a refusal', reply('', { stop_reason: 'refusal' })],
    ['a truncated answer', reply('{"summary": "cut', { stop_reason: 'max_tokens' })],
    ['malformed JSON', reply('not json')],
    ['no text block', { stop_reason: 'end_turn', content: [] }],
  ])('treats %s as invalid output', async (_label, response) => {
    create.mockResolvedValue(response)
    await expect(provider.generateJson(request)).rejects.toMatchObject({ kind: 'invalid_output' })
  })

  it('maps timeouts and aborts to a timeout', async () => {
    create.mockRejectedValueOnce(new Anthropic.APIConnectionTimeoutError())
    await expect(provider.generateJson(request)).rejects.toMatchObject({ kind: 'timeout' })
    create.mockRejectedValueOnce(new Anthropic.APIUserAbortError())
    await expect(provider.generateJson(request)).rejects.toMatchObject({ kind: 'timeout' })
  })

  it('maps API failures to unavailable and logs only the status code', async () => {
    create.mockRejectedValue(new Anthropic.AuthenticationError(401, undefined, 'secret detail', new Headers()))
    await expect(provider.generateJson(request)).rejects.toMatchObject({ kind: 'unavailable' })
    expect(vi.mocked(console.error).mock.calls.flat().join(' ')).toBe('AI provider error (HTTP 401)')
  })
})
