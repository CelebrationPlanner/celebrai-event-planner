import type { Task } from '@celebrai/shared'
import { describe, expect, it } from 'vitest'
import { sortTasks, taskProgress } from './insights'

const task = (title: string, priority: Task['priority'], dueDate: string | null, completed = false): Task => ({
  id: title,
  eventId: 'e',
  title,
  priority,
  dueDate,
  completed,
  kind: 'preparation',
  createdAt: '',
  updatedAt: '',
})

describe('tasks', () => {
  it('computes completion progress', () => {
    expect(taskProgress([task('a', 'low', null, true), task('b', 'low', null), task('c', 'low', null)])).toEqual({
      done: 1,
      total: 3,
      percent: 33,
    })
    expect(taskProgress([])).toEqual({ done: 0, total: 0, percent: 0 })
  })

  it('sorts open tasks by due date, then priority, with undated and completed last', () => {
    const sorted = sortTasks([
      task('done', 'high', '2026-11-02', true),
      task('undated', 'high', null),
      task('later', 'high', '2026-11-09'),
      task('soon-low', 'low', '2026-11-03'),
      task('soon-high', 'high', '2026-11-03'),
    ])
    expect(sorted.map((t) => t.title)).toEqual(['soon-high', 'soon-low', 'later', 'undated', 'done'])
  })
})
