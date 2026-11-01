import type { Task } from '@celebrai/shared'

export function taskProgress(tasks: Task[]) {
  const done = tasks.filter((t) => t.completed).length
  return { done, total: tasks.length, percent: tasks.length ? Math.round((done / tasks.length) * 100) : 0 }
}

const PRIORITY_RANK = { high: 0, medium: 1, low: 2 } as const

/** Open tasks first, then by due date (undated last), then by priority. */
export function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort(
    (a, b) =>
      Number(a.completed) - Number(b.completed) ||
      (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999') ||
      PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority],
  )
}
