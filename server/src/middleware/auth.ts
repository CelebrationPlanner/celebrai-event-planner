import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Request, RequestHandler } from 'express'
import type { Env } from '../config/env.ts'
import type { Database } from '../db/database.types.ts'
import { AppError } from '../lib/errors.ts'

export type Db = SupabaseClient<Database>

declare module 'express-serve-static-core' {
  interface Request {
    auth?: { userId: string; isAnonymous: boolean; db: Db }
  }
}

const noSession = { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
const unauthenticated = () => new AppError(401, 'UNAUTHENTICATED', 'Sign in to continue.')

// getClaims throws (instead of returning an error) when a JWT part is not base64url JSON, which
// would surface as a 500. Malformed tokens are bad input; Supabase outages must still be errors.
const isJsonObject = (part: string) => {
  try {
    const value: unknown = JSON.parse(Buffer.from(part, 'base64url').toString('utf8'))
    return typeof value === 'object' && value !== null
  } catch {
    return false
  }
}

/**
 * Verifies the Supabase access token and attaches the caller's id plus a database client that
 * acts *as that user*, so Row Level Security applies to every query (D9). The user id always
 * comes from the verified token, never from the request body.
 */
export function requireAuth(env: Env): RequestHandler {
  const verifier = createClient<Database>(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, { auth: noSession })

  return async (req, _res, next) => {
    const match = /^Bearer ([\w-]+\.[\w-]+\.[\w-]+)$/.exec(req.get('authorization') ?? '')
    if (!match) throw unauthenticated()
    const token = match[1]
    const [header, payload] = token.split('.')
    if (!isJsonObject(header) || !isJsonObject(payload)) throw unauthenticated()

    const { data, error } = await verifier.auth.getClaims(token)
    if (error || !data?.claims.sub || data.claims.role !== 'authenticated') throw unauthenticated()

    req.auth = {
      userId: data.claims.sub,
      isAnonymous: data.claims.is_anonymous === true,
      db: createClient<Database>(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
        auth: noSession,
        global: { headers: { Authorization: `Bearer ${token}` } },
      }),
    }
    next()
  }
}

export function getAuth(req: Request) {
  if (!req.auth) throw unauthenticated()
  return req.auth
}
