import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createApp } from './app.ts'
import { loadEnv } from './config/env.ts'

const CLIENT_URL = 'http://localhost:5173'
const app = createApp(loadEnv({ NODE_ENV: 'test', CLIENT_URL }))

describe('GET /api/health', () => {
  it('returns ok', async () => {
    const res = await request(app).get('/api/health')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ status: 'ok' })
  })

  it('does not advertise the framework', async () => {
    const res = await request(app).get('/api/health')
    expect(res.headers['x-powered-by']).toBeUndefined()
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

describe('loadEnv', () => {
  it('rejects missing CLIENT_URL and an invalid PORT, naming them without echoing values', () => {
    expect(() => loadEnv({ PORT: 'secret-not-a-port' })).toThrow(/CLIENT_URL.*PORT|PORT.*CLIENT_URL/)
    expect(() => loadEnv({ PORT: 'secret-not-a-port' })).not.toThrow(/secret-not-a-port/)
  })

  it('applies defaults', () => {
    expect(loadEnv({ CLIENT_URL })).toEqual({ NODE_ENV: 'development', PORT: 5000, CLIENT_URL })
  })
})
