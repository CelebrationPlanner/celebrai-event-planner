import type { ApiErrorBody } from '@celebrai/shared'
import type { ErrorRequestHandler, RequestHandler } from 'express'
import { ZodError } from 'zod'
import { AppError } from '../lib/errors.ts'

const send = (res: Parameters<RequestHandler>[1], status: number, error: ApiErrorBody['error']) => res.status(status).json({ error } satisfies ApiErrorBody)

export const notFoundRoute: RequestHandler = (_req, res) => {
  send(res, 404, { code: 'NOT_FOUND', message: 'Route not found.' })
}

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof ZodError) {
    return send(res, 400, {
      code: 'VALIDATION_ERROR',
      message: 'Some fields are invalid.',
      details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    })
  }
  if (err instanceof AppError) return send(res, err.status, { code: err.code, message: err.message, details: err.details })
  if (err?.type === 'entity.too.large') return send(res, 413, { code: 'PAYLOAD_TOO_LARGE', message: 'Request body is too large.' })
  if (err?.type === 'entity.parse.failed') return send(res, 400, { code: 'VALIDATION_ERROR', message: 'Malformed JSON body.' })

  // Unexpected: log a safe summary (no body, headers or tokens) and hide internals from the client.
  console.error(`[${res.getHeader('x-request-id')}] ${req.method} ${req.path} failed: ${err instanceof Error ? err.message : 'unknown error'}`)
  send(res, 500, { code: 'INTERNAL', message: 'Something went wrong. Please try again.' })
}
