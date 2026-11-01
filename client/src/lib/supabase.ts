import { AuthClient } from '@supabase/auth-js'

// Public, browser-safe values only (URL + anon key). Never put service-role or AI keys in VITE_ vars.
// The browser only uses Supabase Auth (all data goes through the API), so this builds the auth client
// on its own, configured as supabase-js would, instead of bundling database/storage/realtime clients.
const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = {
  auth: new AuthClient({
    url: new URL('auth/v1', `${url}/`).href,
    headers: { Authorization: `Bearer ${key}`, apikey: key },
    // Same storage key as supabase-js, so existing sessions keep working.
    storageKey: `sb-${new URL(url).hostname.split('.')[0]}-auth-token`,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'implicit',
  }),
}
