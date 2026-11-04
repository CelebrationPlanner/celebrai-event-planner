import { toast } from 'sonner'
import { api, errorMessage } from '@/lib/api'
import { useRefreshEvent } from '@/lib/queries'
import type { Task } from '@/types'

/** Every change is persisted through the API, then the event's queries refresh. */
export function useTaskActions(eventId: string) {
  const refresh = useRefreshEvent()
  const run = async <T>(work: Promise<T>, success?: string) => {
    try {
      const result = await work
      await refresh(eventId)
      if (success) toast.success(success)
      return result
    } catch (err) {
      toast.error(errorMessage(err))
      throw err
    }
  }
  return {
    add: (input: Pick<Task, 'title' | 'priority' | 'dueDate' | 'kind'>, success?: string) =>
      run(api.createTask(eventId, input), success),
    update: (taskId: string, patch: Parameters<typeof api.updateTask>[2], success?: string) =>
      run(api.updateTask(eventId, taskId, patch), success),
    remove: (taskId: string) => run(api.deleteTask(eventId, taskId)),
  }
}
