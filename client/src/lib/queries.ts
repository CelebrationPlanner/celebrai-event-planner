import { QueryClient, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, ApiError } from './api'

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        // Retry once on network/server trouble; never on 4xx (bad input, auth, not found).
        retry: (count, err) => count < 1 && (!(err instanceof ApiError) || err.status === 0 || err.status >= 500),
      },
    },
  })
}

export const keys = {
  dashboard: ['dashboard'] as const,
  profile: ['profile'] as const,
  event: (id: string) => ['event', id] as const,
  plan: (id: string) => ['event', id, 'plan'] as const,
  budget: (id: string) => ['event', id, 'budget'] as const,
  tasks: (id: string) => ['event', id, 'tasks'] as const,
  conversation: (id: string) => ['event', id, 'conversation'] as const,
  suggestions: (id: string) => ['event', id, 'suggestions'] as const,
}

export const useDashboard = () => useQuery({ queryKey: keys.dashboard, queryFn: api.dashboard })
export const useProfile = () => useQuery({ queryKey: keys.profile, queryFn: api.profile })
export const useEventQuery = (id: string) => useQuery({ queryKey: keys.event(id), queryFn: () => api.event(id), enabled: id !== '' })
export const usePlan = (id: string) => useQuery({ queryKey: keys.plan(id), queryFn: () => api.plan(id) })
export const useBudget = (id: string) => useQuery({ queryKey: keys.budget(id), queryFn: () => api.budget(id) })
export const useTasks = (id: string) => useQuery({ queryKey: keys.tasks(id), queryFn: () => api.tasks(id) })
export const useConversation = (id: string) => useQuery({ queryKey: keys.conversation(id), queryFn: () => api.conversation(id), enabled: id !== '' })

/** Engine suggestions (no AI). Fetched only when a review dialog opens. */
export const useSuggestions = (id: string, enabled: boolean) => useQuery({ queryKey: keys.suggestions(id), queryFn: () => api.suggestions(id), enabled })

/** After any change to an event, refresh everything derived from it (including the dashboard). */
export function useRefreshEvent() {
  const qc = useQueryClient()
  return (id: string) => Promise.all([qc.invalidateQueries({ queryKey: ['event', id] }), qc.invalidateQueries({ queryKey: keys.dashboard })])
}
