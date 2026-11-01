import { createClient } from '@supabase/supabase-js'

// Public, browser-safe values only (URL + anon key). Never put service-role or AI keys in VITE_ vars.
export const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY)
