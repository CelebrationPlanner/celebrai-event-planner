import type { Session } from '@supabase/supabase-js'
import { useQueryClient } from '@tanstack/react-query'
import { createContext, use, useEffect, useRef, useState, type ReactNode } from 'react'
import { api } from '@/lib/api'
import { supabase } from '@/lib/supabase'

interface AuthState {
  session: Session | null
  loading: boolean
}

const AuthContext = createContext<AuthState>({ session: null, loading: true })

/** Restores the Supabase session on load and keeps it in sync across sign-in, sign-out and refresh. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ session: null, loading: true })
  const queryClient = useQueryClient()
  const userId = useRef<string | undefined>(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      userId.current = data.session?.user.id
      setState({ session: data.session, loading: false })
    })
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      // Never show one account's cached data to the next.
      if (session?.user.id !== userId.current) {
        queryClient.clear()
        userId.current = session?.user.id
      }
      setState({ session, loading: false })
    })
    return () => data.subscription.unsubscribe()
  }, [queryClient])

  return <AuthContext value={state}>{children}</AuthContext>
}

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
