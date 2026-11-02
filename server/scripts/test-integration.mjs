// Runs the database integration tests against the local Supabase stack (`npx supabase start`).
// Keys come straight from `supabase status`, so nothing is written to disk.
import { execSync, spawnSync } from 'node:child_process'

let status
try {
  status = JSON.parse(
    execSync('npx supabase status -o json', {
      cwd: new URL('../..', import.meta.url),
      stdio: ['ignore', 'pipe', 'ignore'],
    }).toString(),
  )
} catch {
  console.error('Local Supabase is not running. Start it with: npx supabase start')
  process.exit(1)
}

const result = spawnSync('npx', ['vitest', 'run', 'int.test'], {
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    SUPABASE_URL: status.API_URL,
    SUPABASE_ANON_KEY: status.ANON_KEY ?? status.PUBLISHABLE_KEY,
    // Test-only: creates and deletes the two test users. Never used by the API itself.
    SUPABASE_SERVICE_ROLE_KEY: status.SERVICE_ROLE_KEY ?? status.SECRET_KEY,
  },
})
process.exit(result.status ?? 1)
