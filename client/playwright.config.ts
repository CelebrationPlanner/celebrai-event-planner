import { defineConfig, devices } from '@playwright/test'

// End-to-end tests run the real client + API against the local Supabase stack
// (`npx supabase start`). Ports are separate from the usual dev servers.
const CLIENT = 'http://localhost:5175'
const API = 'http://localhost:5055'

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: { baseURL: CLIENT, trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] }, grepInvert: /@mobile/ },
    { name: 'mobile', use: { ...devices['Pixel 7'] }, grep: /@mobile/ },
  ],
  webServer: [
    {
      // Real env values come from server/.env; these override only what the test setup needs.
      command: 'npm run dev -w server',
      cwd: '..',
      url: `${API}/api/health`,
      env: { PORT: '5055', CLIENT_URL: CLIENT, GEMINI_API_KEY: '' },
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: 'npm run dev -w client -- --port 5175 --strictPort',
      cwd: '..',
      url: CLIENT,
      env: { VITE_API_BASE_URL: `${API}/api` },
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
})
