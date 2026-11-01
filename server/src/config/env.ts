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
  // AI routes: stricter per-user limit, since each call costs money and time.
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(10),
  // Optional: without a key the API runs and AI routes answer 503.
  GEMINI_API_KEY: z
    .string()
    .trim()
    .optional()
    .transform((v) => v || undefined), // blank (as in .env.example) = not configured
  GEMINI_MODEL: z.string().min(1).default('gemini-flash-latest'),
  AI_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),
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
