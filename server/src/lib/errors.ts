import type { ApiErrorBody } from '@celebrai/shared'

type ErrorCode = ApiErrorBody['error']['code']

export class AppError extends Error {
  readonly status: number
  readonly code: ErrorCode
  readonly details?: unknown

  constructor(status: number, code: ErrorCode, message: string, details?: unknown) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
  }
}

/** 404 for both "doesn't exist" and "belongs to someone else", so ownership is never disclosed. */
export const notFound = (what = 'Resource') => new AppError(404, 'NOT_FOUND', `${what} not found.`)

export const invalid = (message: string, path?: string) =>
  new AppError(400, 'VALIDATION_ERROR', message, path ? [{ path, message }] : undefined)

type DbResult = { data: unknown; error: { code?: string; message: string } | null }

/** Maps database errors onto safe API errors; never forwards database messages to clients. */
function rethrow(error: { code?: string }): never {
  switch (error.code) {
    case '23514': // check_violation
    case '23505': // unique_violation
      throw new AppError(400, 'VALIDATION_ERROR', 'The request breaks a data rule.')
    case '23503': // foreign_key_violation: parent event missing or not owned
      throw notFound('Event')
    default:
      throw new Error(`Database error ${error.code ?? ''}`.trim())
  }
}

/** For queries that must return data (inserts, updates, lists). */
export function unwrap<R extends DbResult>(result: R): NonNullable<R['data']> {
  if (result.error) rethrow(result.error)
  if (result.data === null) throw new Error('Database returned no data')
  return result.data as NonNullable<R['data']>
}

/** For `.maybeSingle()` lookups where "no row" is a normal outcome. */
export function unwrapMaybe<R extends DbResult>(result: R): R['data'] {
  if (result.error) rethrow(result.error)
  return result.data
}
