// ponytail: in-memory demo store (lost on refresh). Phase 5 replaces it with API calls
// against the real backend; demo mode then becomes an anonymous Supabase user (D10).
import { createContext, use, useMemo, useReducer, type Dispatch, type ReactNode } from 'react'
import type { CelebrationEvent, Expense, Task } from '@/types'
import { createDemoState, type DemoState } from './demoData'

export type NewEvent = Omit<CelebrationEvent, 'id' | 'status' | 'createdAt' | 'invitationText' | 'invitationTone'>

type Action =
  | { type: 'createEvent'; event: CelebrationEvent }
  | { type: 'updateEvent'; id: string; patch: Partial<CelebrationEvent> }
  | { type: 'addTask'; task: Task }
  | { type: 'updateTask'; id: string; patch: Partial<Task> }
  | { type: 'deleteTask'; id: string }
  | { type: 'restoreTask'; task: Task }
  | { type: 'updateExpense'; id: string; patch: Pick<Expense, 'estimatedMinor' | 'actualMinor'> }
  | { type: 'updateProfile'; patch: Partial<DemoState['profile']> }
  | { type: 'reset' }
  | { type: 'clear' }

function log(state: DemoState, eventId: string | null, message: string): DemoState['activity'] {
  return [{ id: crypto.randomUUID(), eventId, message, at: new Date().toISOString() }, ...state.activity].slice(0, 20)
}

function demoReducer(state: DemoState, action: Action): DemoState {
  switch (action.type) {
    case 'createEvent':
      return { ...state, events: [action.event, ...state.events], activity: log(state, action.event.id, `Created ${action.event.eventName}`) }
    case 'updateEvent':
      return { ...state, events: state.events.map((e) => (e.id === action.id ? { ...e, ...action.patch } : e)) }
    case 'addTask':
      return { ...state, tasks: [...state.tasks, action.task], activity: log(state, action.task.eventId, `Added task “${action.task.title}”`) }
    case 'updateTask': {
      const task = state.tasks.find((t) => t.id === action.id)
      if (!task) return state
      const completedNow = action.patch.completed === true && !task.completed
      return {
        ...state,
        tasks: state.tasks.map((t) => (t.id === action.id ? { ...t, ...action.patch } : t)),
        activity: completedNow ? log(state, task.eventId, `Completed “${task.title}”`) : state.activity,
      }
    }
    case 'deleteTask':
      return { ...state, tasks: state.tasks.filter((t) => t.id !== action.id) }
    case 'restoreTask':
      return { ...state, tasks: [...state.tasks, action.task] }
    case 'updateExpense':
      return { ...state, expenses: state.expenses.map((x) => (x.id === action.id ? { ...x, ...action.patch } : x)) }
    case 'updateProfile':
      return { ...state, profile: { ...state.profile, ...action.patch } }
    case 'reset':
      return createDemoState()
    case 'clear':
      return { ...createDemoState(), events: [], plans: [], expenses: [], tasks: [], messages: [], activity: [] }
  }
}

function useDemoActions(dispatch: Dispatch<Action>) {
  return useMemo(
    () => ({
      createEvent(input: NewEvent): CelebrationEvent {
        const event: CelebrationEvent = {
          ...input,
          id: crypto.randomUUID(),
          status: 'draft',
          invitationText: '',
          invitationTone: 'friendly',
          createdAt: new Date().toISOString(),
        }
        dispatch({ type: 'createEvent', event })
        return event
      },
      updateEvent: (id: string, patch: Partial<CelebrationEvent>) => dispatch({ type: 'updateEvent', id, patch }),
      addTask: (task: Omit<Task, 'id' | 'completed'>) => dispatch({ type: 'addTask', task: { ...task, id: crypto.randomUUID(), completed: false } }),
      updateTask: (id: string, patch: Partial<Task>) => dispatch({ type: 'updateTask', id, patch }),
      deleteTask: (id: string) => dispatch({ type: 'deleteTask', id }),
      restoreTask: (task: Task) => dispatch({ type: 'restoreTask', task }),
      updateExpense: (id: string, patch: Pick<Expense, 'estimatedMinor' | 'actualMinor'>) => dispatch({ type: 'updateExpense', id, patch }),
      updateProfile: (patch: Partial<DemoState['profile']>) => dispatch({ type: 'updateProfile', patch }),
      reset: () => dispatch({ type: 'reset' }),
      clear: () => dispatch({ type: 'clear' }),
    }),
    [dispatch],
  )
}

type DemoStore = DemoState & { actions: ReturnType<typeof useDemoActions> }
const DemoContext = createContext<DemoStore | null>(null)

export function DemoStoreProvider({ children, initialState }: { children: ReactNode; initialState?: DemoState }) {
  const [state, dispatch] = useReducer(demoReducer, initialState, (init) => init ?? createDemoState())
  const actions = useDemoActions(dispatch)
  const value = useMemo(() => ({ ...state, actions }), [state, actions])
  return <DemoContext value={value}>{children}</DemoContext>
}

export function useDemoStore(): DemoStore {
  const store = use(DemoContext)
  if (!store) throw new Error('useDemoStore must be used inside DemoStoreProvider')
  return store
}
