import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createApp } from './app.ts'
import { loadEnv } from './config/env.ts'

const CLIENT_URL = 'http://localhost:5173'
const baseEnv = { NODE_ENV: 'test', CLIENT_URL, SUPABASE_URL: 'http://127.0.0.1:1', SUPABASE_ANON_KEY: 'test-anon-key-not-a-secret' }
const app = createApp(loadEnv(baseEnv))

describe('GET /api/health', () => {
  it('returns ok without authentication', async () => {
    const res = await request(app).get('/api/health')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ status: 'ok' })
  })

  it('sends security headers and hides the framework', async () => {
    const res = await request(app).get('/api/health')
    expect(res.headers['x-powered-by']).toBeUndefined()
    expect(res.headers['x-content-type-options']).toBe('nosniff')
    expect(res.headers['x-request-id']).toMatch(/^[\w-]{36}$/)
  })
})

describe('CORS', () => {
  it('allows the configured client origin', async () => {
    const res = await request(app).get('/api/health').set('Origin', CLIENT_URL)
    expect(res.headers['access-control-allow-origin']).toBe(CLIENT_URL)
  })

  it('does not allow other origins', async () => {
    const res = await request(app).get('/api/health').set('Origin', 'https://evil.example')
    expect(res.headers['access-control-allow-origin']).not.toBe('https://evil.example')
  })
})

describe('authentication gate (AUTH-03 / AUTH-04)', () => {
  it.each([
    ['no header', undefined],
    ['wrong scheme', 'Basic abc'],
    ['malformed token', 'Bearer not-a-jwt'],
  ])('rejects %s with 401 and the standard error shape', async (_label, header) => {
    const req = request(app).get('/api/events')
    const res = await (header ? req.set('Authorization', header) : req)
    expect(res.status).toBe(401)
    expect(res.body).toEqual({ error: { code: 'UNAUTHENTICATED', message: 'Sign in to continue.' } })
  })
})

describe('request handling', () => {
  it('returns a JSON 404 for unknown routes', async () => {
    const res = await request(app).get('/nope')
    expect(res.status).toBe(404)
    expect(res.body.error.code).toBe('NOT_FOUND')
  })

  it('rejects oversized bodies with 413 before authentication', async () => {
    const res = await request(app).post('/api/events').set('Content-Type', 'application/json').send(JSON.stringify({ x: 'a'.repeat(110_000) }))
    expect(res.status).toBe(413)
    expect(res.body.error.code).toBe('PAYLOAD_TOO_LARGE')
  })

  it('rejects malformed JSON with 400', async () => {
    const res = await request(app).post('/api/events').set('Content-Type', 'application/json').send('{"broken":')
    expect(res.status).toBe(400)
    expect(res.body.error.message).toBe('Malformed JSON body.')
  })

  it('rate-limits API requests with 429', async () => {
    const limited = createApp(loadEnv({ ...baseEnv, API_RATE_LIMIT_MAX_REQUESTS: '2' }))
    await request(limited).get('/api/events')
    await request(limited).get('/api/events')
    const res = await request(limited).get('/api/events')
    expect(res.status).toBe(429)
    expect(res.body.error.code).toBe('RATE_LIMITED')
  })
})

describe('loadEnv', () => {
  it('names missing/invalid variables without echoing values', () => {
    const run = () => loadEnv({ PORT: 'secret-not-a-port' })
    expect(run).toThrow(/PORT/)
    expect(run).toThrow(/CLIENT_URL/)
    expect(run).toThrow(/SUPABASE_URL/)
    expect(run).not.toThrow(/secret-not-a-port/)
  })

  it('treats a blank GEMINI_API_KEY (as in .env.example) as not configured', () => {
    expect(loadEnv({ ...baseEnv, GEMINI_API_KEY: '' }).GEMINI_API_KEY).toBeUndefined()
    expect(loadEnv({ ...baseEnv, GEMINI_API_KEY: '  ' }).GEMINI_API_KEY).toBeUndefined()
  })

  it('applies defaults', () => {
    expect(loadEnv(baseEnv)).toMatchObject({ NODE_ENV: 'test', PORT: 5000, RATE_LIMIT_WINDOW_MS: 60_000, API_RATE_LIMIT_MAX_REQUESTS: 120 })
  })
})
