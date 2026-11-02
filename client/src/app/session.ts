import type { Session } from '@supabase/supabase-js'
import { createContext, use } from 'react'
import { api } from '@/lib/api'
import { supabase } from '@/lib/supabase'

export interface AuthState {
  session: Session | null
  loading: boolean
}

export const AuthContext = createContext<AuthState>({ session: null, loading: true })

export const useAuth = () => use(AuthContext)

/** Saves the browser's time zone so "today" and deadlines match the user (D8). Best effort. */
export async function syncTimeZone() {
  await api.updateProfile({ timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }).catch(() => undefined)
}

/**
 * "Try the demo": an isolated anonymous Supabase user with one labelled sample event (D10).
 * Signed-in real users just go to their dashboard.
 */
export async function startDemo() {
  const { data } = await supabase.auth.getSession()
  if (data.session && !data.session.user.is_anonymous) return
  if (!data.session) {
    const { error } = await supabase.auth.signInAnonymously()
    if (error) throw new Error('Couldn’t start the demo right now. Please try again.')
    await syncTimeZone()
  }
  await api.seedDemo()
}
