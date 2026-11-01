import cors from 'cors'
import express from 'express'
import type { Env } from './config/env.ts'

export function createApp(env: Env) {
  const app = express()
  app.disable('x-powered-by')
  app.use(cors({ origin: env.CLIENT_URL }))

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' })
  })

  return app
}
