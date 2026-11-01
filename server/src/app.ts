import cors from 'cors'
import express, { type RequestHandler } from 'express'
import { rateLimit } from 'express-rate-limit'
import helmet from 'helmet'
import { randomUUID } from 'node:crypto'
import { createClaudeProvider } from './ai/claude.ts'
import { createGeminiProvider } from './ai/gemini.ts'
import { unconfiguredProvider, type AIProvider } from './ai/provider.ts'
import type { Env } from './config/env.ts'
import { AppError } from './lib/errors.ts'
import { requireAuth } from './middleware/auth.ts'
import { errorHandler, notFoundRoute } from './middleware/errorHandler.ts'
import { budgetRouter } from './modules/budget.ts'
import { dashboardRouter } from './modules/dashboard.ts'
import { demoRouter } from './modules/demo.ts'
import { eventsRouter } from './modules/events.ts'
import { createPlannerRouter } from './modules/planner.ts'
import { profileRouter } from './modules/profile.ts'
import { suggestionsRouter } from './modules/suggestions.ts'
import { tasksRouter } from './modules/tasks.ts'

/** Request id + one safe log line per request: method, path (no query), status, duration. */
function requestLog(enabled: boolean): RequestHandler {
  return (req, res, next) => {
    const id = randomUUID()
    const start = performance.now()
    res.setHeader('x-request-id', id)
    if (enabled) res.on('finish', () => console.log(`[${id}] ${req.method} ${req.path} ${res.statusCode} ${Math.round(performance.now() - start)}ms`))
    next()
  }
}

/** The configured AI provider, or one that answers "unavailable" when its key is missing. */
function selectProvider(env: Env): AIProvider {
  const timeoutMs = env.AI_TIMEOUT_MS
  if (env.AI_PROVIDER === 'claude') return env.ANTHROPIC_API_KEY ? createClaudeProvider({ apiKey: env.ANTHROPIC_API_KEY, model: env.CLAUDE_MODEL, timeoutMs }) : unconfiguredProvider
  return env.GEMINI_API_KEY ? createGeminiProvider({ apiKey: env.GEMINI_API_KEY, model: env.GEMINI_MODEL, timeoutMs }) : unconfiguredProvider
}

const rateLimited = () => new AppError(429, 'RATE_LIMITED', 'Too many requests. Please wait a moment and try again.')

export function createApp(env: Env, deps: { ai?: AIProvider } = {}) {
  const ai = deps.ai ?? selectProvider(env)
  // Per user (not per IP), applied after authentication on AI routes only.
  const aiLimiter = rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    limit: env.RATE_LIMIT_MAX_REQUESTS,
    keyGenerator: (req) => req.auth!.userId,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_req, _res, next) => next(rateLimited()),
  })

  const app = express()
  app.disable('x-powered-by')
  app.set('trust proxy', 1) // Render terminates TLS in front of the app; needed for per-client rate limits.

  app.use(requestLog(env.NODE_ENV !== 'test'))
  app.use(helmet())
  app.use(cors({ origin: env.CLIENT_URL }))
  app.use(express.json({ limit: '100kb' }))

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' })
  })

  app.use(
    '/api',
    rateLimit({
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      limit: env.API_RATE_LIMIT_MAX_REQUESTS,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      handler: (_req, _res, next) => next(rateLimited()),
    }),
    requireAuth(env),
    eventsRouter,
    tasksRouter,
    budgetRouter,
    profileRouter,
    dashboardRouter,
    demoRouter,
    suggestionsRouter,
    createPlannerRouter(ai, aiLimiter),
  )

  app.use(notFoundRoute)
  app.use(errorHandler)
  return app
}
