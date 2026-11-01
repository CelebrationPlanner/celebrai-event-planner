// Shared helpers for *.int.test.ts: real users on the local Supabase stack.
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Express } from 'express'
import request from 'supertest'
import { loadEnv } from '../config/env.ts'
import type { Database } from '../db/database.types.ts'

const { SUPABASE_URL = '', SUPABASE_ANON_KEY = '', SUPABASE_SERVICE_ROLE_KEY = '' } = process.env
const noSession = { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }

export { SUPABASE_ANON_KEY, SUPABASE_URL, noSession }
export const admin = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: noSession })
export const testEnv = (overrides: Record<string, string> = {}) =>
  loadEnv({ NODE_ENV: 'test', CLIENT_URL: 'http://localhost:5173', SUPABASE_URL, SUPABASE_ANON_KEY, API_RATE_LIMIT_MAX_REQUESTS: '10000', RATE_LIMIT_MAX_REQUESTS: '10000', ...overrides })

export interface TestUser {
  id: string
  token: string
  db: SupabaseClient<Database>
}

export async function makeUser(label: string): Promise<TestUser> {
  const email = `${label}-${crypto.randomUUID()}@celebrai.test`
  const password = `pw-${crypto.randomUUID()}`
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (created.error) throw created.error
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: noSession })
  const { data, error } = await client.auth.signInWithPassword({ email, password })
  if (error || !data.session) throw error ?? new Error('no session')
  const db = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: noSession, global: { headers: { Authorization: `Bearer ${data.session.access_token}` } } })
  return { id: data.user.id, token: data.session.access_token, db }
}

/** Deleting the users cascades to every row they own. */
export const deleteUsers = (users: Array<TestUser | undefined>) => Promise.all(users.filter((u) => u !== undefined).map((u) => admin.auth.admin.deleteUser(u.id)))

export const client = (app: Express, user: TestUser) => ({
  get: (path: string) => request(app).get(`/api${path}`).set('Authorization', `Bearer ${user.token}`),
  post: (path: string, body: object) => request(app).post(`/api${path}`).set('Authorization', `Bearer ${user.token}`).send(body),
  patch: (path: string, body: object) => request(app).patch(`/api${path}`).set('Authorization', `Bearer ${user.token}`).send(body),
  delete: (path: string) => request(app).delete(`/api${path}`).set('Authorization', `Bearer ${user.token}`),
})
