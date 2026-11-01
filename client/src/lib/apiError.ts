import type { ApiErrorBody } from '@celebrai/shared'

/** Every API failure, with a message that is safe to show users. Kept separate from api.ts so tests can mock the client but not the error type. */
export class ApiError extends Error {
  readonly status: number
  readonly code: ApiErrorBody['error']['code'] | 'TIMEOUT' | 'NETWORK'
  readonly details?: Array<{ path: string; message: string }>

  constructor(status: number, code: ApiError['code'], message: string, details?: ApiError['details']) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
  }
}
