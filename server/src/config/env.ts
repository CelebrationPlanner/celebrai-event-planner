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
  // AI spend guards (each AI call is billed). Per IP per window, so minting anonymous users can't
  // multiply the per-user limit; daily quotas per user (lower for anonymous demo users) and in total.
  AI_RATE_LIMIT_PER_IP: z.coerce.number().int().positive().default(20),
  AI_DAILY_LIMIT_PER_USER: z.coerce.number().int().positive().default(50),
  AI_DAILY_LIMIT_ANONYMOUS: z.coerce.number().int().positive().default(10),
  AI_DAILY_LIMIT_TOTAL: z.coerce.number().int().positive().default(1000),
  // Which AI provider writes plan text. Without its key the API still runs and AI routes answer 503.
  AI_PROVIDER: z.enum(['gemini', 'claude']).default('gemini'),
  ANTHROPIC_API_KEY: z
    .string()
    .trim()
    .optional()
    .transform((v) => v || undefined),
  CLAUDE_MODEL: z.string().min(1).default('claude-opus-5-5'),
  GEMINI_API_KEY: z
    .string()
    .trim()
    .optional()
    .transform((v) => v || undefined), // blank (as in .env.example) = not configured
  GEMINI_MODEL: z.string().min(1).default('gemini-flash-latest'),
  // Full plans take ~35-40 s on Claude Opus 5.5; stays below the client's 90 s AI timeout and covers retries.
  AI_TIMEOUT_MS: z.coerce.number().int().positive().default(75_000),
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
