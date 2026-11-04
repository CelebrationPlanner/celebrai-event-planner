import { Field, selectClass } from '@/components/Field'
import { Input } from '@/components/ui/input'
import { todayISO } from '@/lib/dates'
import type { Priority } from '@/types'
import { PRIORITIES } from './taskForm'

/** Title, priority and due date: shared by the add-task form and the edit dialog. */
export function TaskFields({
  title,
  priority,
  dueDate,
  error,
  eventDate,
  onChange,
}: {
  title: string
  priority: Priority
  dueDate: string
  error?: string
  eventDate: string | null
  onChange: (patch: Partial<{ title: string; priority: Priority; dueDate: string }>) => void
}) {
  return (
    <>
      <Field label="Task" error={error}>
        {(p) => (
          <Input
            {...p}
            value={title}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder="e.g. Confirm the photographer"
          />
        )}
      </Field>
      <Field label="Priority">
        {(p) => (
          <select
            {...p}
            className={selectClass}
            value={priority}
            onChange={(e) => onChange({ priority: e.target.value as Priority })}
          >
            {PRIORITIES.map((pr) => (
              <option key={pr} value={pr} className="capitalize">
                {pr}
              </option>
            ))}
          </select>
        )}
      </Field>
      <Field label="Due date">
        {(p) => (
          <Input
            {...p}
            type="date"
            min={todayISO()}
            max={eventDate ?? undefined}
            value={dueDate}
            onChange={(e) => onChange({ dueDate: e.target.value })}
          />
        )}
      </Field>
    </>
  )
}
