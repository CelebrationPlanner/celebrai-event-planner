import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  CLIENT_URL: z.url(),
  SUPABASE_URL: z.url(),
  // Public (anon/publishable) key. The API forwards each user's token, so RLS always applies.
  SUPABASE_ANON_KEY: z.string().min(20),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  API_RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(120),
})

export type Env = z.infer<typeof envSchema>

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = envSchema.safeParse(source)
  if (!result.success) {
    // Report variable names only: values may be secrets.
    const names = result.error.issues.map((issue) => issue.path.join('.')).join(', ')
    throw new Error(`Invalid environment configuration: ${names}`)
  }
  return result.data
}
