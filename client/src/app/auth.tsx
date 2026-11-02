import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { AuthContext, type AuthState } from './session'

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
