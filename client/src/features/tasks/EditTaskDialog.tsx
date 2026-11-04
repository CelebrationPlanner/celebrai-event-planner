import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { todayISO } from '@/lib/dates'
import type { Task } from '@/types'
import { TaskFields } from './TaskFields'
import { validateTask } from './taskForm'
import { useTaskActions } from './useTaskActions'

export function EditTaskDialog({
  task,
  eventDate,
  onClose,
}: {
  task: Task
  eventDate: string | null
  onClose: () => void
}) {
  const actions = useTaskActions(task.eventId)
  const [saving, setSaving] = useState(false)
  const [values, setValues] = useState({ title: task.title, priority: task.priority, dueDate: task.dueDate ?? '' })
  const [error, setError] = useState<string>()

  async function save(e: FormEvent) {
    e.preventDefault()
    // Unchanged past due dates on existing tasks stay valid; only new dates are checked.
    const problem = validateTask(
      values.title,
      values.dueDate === task.dueDate ? '' : values.dueDate,
      todayISO(),
      eventDate,
    )
    if (problem) return setError(problem)
    setSaving(true)
    await actions
      .update(
        task.id,
        { title: values.title.trim(), priority: values.priority, dueDate: values.dueDate || null },
        'Task updated',
      )
      .then(onClose, () => setSaving(false))
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <form onSubmit={save} noValidate className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Edit task</DialogTitle>
            <DialogDescription>Changes are saved to this event’s checklist.</DialogDescription>
          </DialogHeader>
          <TaskFields
            {...values}
            error={error}
            eventDate={eventDate}
            onChange={(patch) => setValues((v) => ({ ...v, ...patch }))}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
