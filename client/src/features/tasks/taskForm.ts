import type { Priority } from '@/types'

export const PRIORITIES: Priority[] = ['high', 'medium', 'low']

/** Returns an error message, or null when the task input is valid. */
export function validateTask(title: string, dueDate: string, today: string, eventDate: string | null): string | null {
  if (title.trim().length < 2) return 'Enter a task title (at least 2 characters).'
  if (title.trim().length > 200) return 'Keep the title under 200 characters.'
  if (dueDate && dueDate < today) return 'The due date can’t be in the past.'
  if (dueDate && eventDate && dueDate > eventDate) return 'The due date must be on or before the event date.'
  return null
}
