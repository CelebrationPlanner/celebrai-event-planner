import { CalendarDays, ListChecks, Pencil, Plus, Trash2, WandSparkles } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { EmptyState } from '@/components/EmptyState'
import { Field, selectClass } from '@/components/Field'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { ErrorState, LoadingBlock } from '@/components/QueryStates'
import { api, errorMessage } from '@/lib/api'
import { formatDate, todayISO } from '@/lib/dates'
import { sortTasks, taskProgress } from '@/lib/insights'
import { useRefreshEvent, useTasks } from '@/lib/queries'
import type { Priority, Task } from '@/types'
import { useEvent } from '../events/useEvent'
import { SuggestTasksDialog } from './SuggestTasksDialog'
import { PRIORITIES, validateTask } from './taskForm'

/** Every change is persisted through the API, then the event's queries refresh. */
function useTaskActions(eventId: string) {
  const refresh = useRefreshEvent()
  const run = async <T,>(work: Promise<T>, success?: string) => {
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
    add: (input: Pick<Task, 'title' | 'priority' | 'dueDate' | 'kind'>, success?: string) => run(api.createTask(eventId, input), success),
    update: (taskId: string, patch: Parameters<typeof api.updateTask>[2], success?: string) => run(api.updateTask(eventId, taskId, patch), success),
    remove: (taskId: string) => run(api.deleteTask(eventId, taskId)),
  }
}

const FILTERS = ['all', 'active', 'completed'] as const
type Filter = (typeof FILTERS)[number]

const priorityClass: Record<Priority, string> = {
  high: 'border-coral text-accent-foreground',
  medium: 'border-gold text-gold-foreground',
  low: 'text-muted-foreground',
}

function TaskFields({ title, priority, dueDate, error, eventDate, onChange }: {
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
        {(p) => <Input {...p} value={title} onChange={(e) => onChange({ title: e.target.value })} placeholder="e.g. Confirm the photographer" />}
      </Field>
      <Field label="Priority">
        {(p) => (
          <select {...p} className={selectClass} value={priority} onChange={(e) => onChange({ priority: e.target.value as Priority })}>
            {PRIORITIES.map((pr) => (
              <option key={pr} value={pr} className="capitalize">{pr}</option>
            ))}
          </select>
        )}
      </Field>
      <Field label="Due date">
        {(p) => <Input {...p} type="date" min={todayISO()} max={eventDate ?? undefined} value={dueDate} onChange={(e) => onChange({ dueDate: e.target.value })} />}
      </Field>
    </>
  )
}

function EditTaskDialog({ task, eventDate, onClose }: { task: Task; eventDate: string | null; onClose: () => void }) {
  const actions = useTaskActions(task.eventId)
  const [saving, setSaving] = useState(false)
  const [values, setValues] = useState({ title: task.title, priority: task.priority, dueDate: task.dueDate ?? '' })
  const [error, setError] = useState<string>()

  async function save(e: FormEvent) {
    e.preventDefault()
    // Unchanged past due dates on existing tasks stay valid; only new dates are checked.
    const problem = validateTask(values.title, values.dueDate === task.dueDate ? '' : values.dueDate, todayISO(), eventDate)
    if (problem) return setError(problem)
    setSaving(true)
    await actions
      .update(task.id, { title: values.title.trim(), priority: values.priority, dueDate: values.dueDate || null }, 'Task updated')
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
          <TaskFields {...values} error={error} eventDate={eventDate} onChange={(patch) => setValues((v) => ({ ...v, ...patch }))} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function ChecklistPage() {
  const event = useEvent()
  const query = useTasks(event.id)
  const actions = useTaskActions(event.id)
  const [adding, setAdding] = useState(false)
  const [filter, setFilter] = useState<Filter>('all')
  const [draft, setDraft] = useState({ title: '', priority: 'medium' as Priority, dueDate: '' })
  const [error, setError] = useState<string>()
  const [editing, setEditing] = useState<Task | null>(null)
  const [suggesting, setSuggesting] = useState(false)

  const tasks = query.data ?? []
  const progress = taskProgress(tasks)
  const visible = sortTasks(tasks).filter((t) => (filter === 'all' ? true : filter === 'active' ? !t.completed : t.completed))
  const today = todayISO()

  async function add(e: FormEvent) {
    e.preventDefault()
    const problem = validateTask(draft.title, draft.dueDate, today, event.eventDate)
    if (problem) return setError(problem)
    setAdding(true)
    try {
      await actions.add({ title: draft.title.trim(), priority: draft.priority, dueDate: draft.dueDate || null, kind: 'preparation' }, 'Task added')
      setDraft({ title: '', priority: 'medium', dueDate: '' })
      setError(undefined)
    } catch {
      // toast already shown
    } finally {
      setAdding(false)
    }
  }

  async function remove(task: Task) {
    await actions.remove(task.id).catch(() => undefined)
    // Undo re-creates the task with the same details.
    toast('Task deleted', {
      description: task.title,
      action: { label: 'Undo', onClick: () => actions.add({ title: task.title, priority: task.priority, dueDate: task.dueDate, kind: task.kind }, 'Task restored').catch(() => undefined) },
    })
  }

  if (query.isPending) return <LoadingBlock rows={4} label="Loading checklist" />
  if (query.error) return <ErrorState error={query.error} onRetry={() => query.refetch()} />

  return (
    <div className="flex flex-col gap-6">
      <Card className="gap-3 p-5">
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold">Completion</span>
          <span className="text-muted-foreground">
            {progress.done} of {progress.total} done · {progress.percent}%
          </span>
        </div>
        <Progress value={progress.percent} aria-label="Checklist completion" />
        <Button variant="outline" size="sm" className="self-start" onClick={() => setSuggesting(true)}>
          <WandSparkles aria-hidden="true" /> Suggest tasks
        </Button>
      </Card>

      <Card className="p-5">
        <form onSubmit={add} noValidate className="grid items-start gap-4 md:grid-cols-[1fr_9rem_10rem_auto]">
          <TaskFields {...draft} error={error} eventDate={event.eventDate} onChange={(patch) => setDraft((d) => ({ ...d, ...patch }))} />
          <Button type="submit" className="md:mt-6" disabled={adding}>
            <Plus aria-hidden="true" /> Add task
          </Button>
        </form>
      </Card>

      <div className="flex gap-1 self-start rounded-xl bg-muted p-1" role="group" aria-label="Filter tasks">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={filter === f}
            onClick={() => setFilter(f)}
            className="rounded-lg px-3 py-1.5 text-sm font-medium capitalize text-muted-foreground aria-pressed:bg-card aria-pressed:text-foreground aria-pressed:shadow-sm focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            {f}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title={tasks.length === 0 ? 'No tasks yet' : `No ${filter} tasks`}
          description={tasks.length === 0 ? 'Add your first task above, or use “Suggest tasks” for a prioritised checklist with realistic deadlines.' : 'Try a different filter.'}
        />
      ) : (
        <Card className="gap-0 p-0">
          <ul className="divide-y" aria-label="Tasks">
            {visible.map((t) => {
              const overdue = !t.completed && t.dueDate !== null && t.dueDate < today
              return (
                <li key={t.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                  <Checkbox
                    id={`task-${t.id}`}
                    checked={t.completed}
                    onCheckedChange={(checked) => actions.update(t.id, { completed: checked === true }).catch(() => undefined)}
                  />
                  <label htmlFor={`task-${t.id}`} className={`min-w-40 flex-1 cursor-pointer ${t.completed ? 'text-muted-foreground line-through' : ''}`}>
                    {t.title}
                  </label>
                  <Badge variant="outline" className={`capitalize ${priorityClass[t.priority]}`}>{t.priority}</Badge>
                  {t.dueDate && (
                    <span className={`inline-flex items-center gap-1 text-sm ${overdue ? 'font-medium text-destructive' : 'text-muted-foreground'}`}>
                      <CalendarDays className="size-3.5" aria-hidden="true" />
                      {overdue && 'Overdue · '}
                      {formatDate(t.dueDate, { day: 'numeric', month: 'short' })}
                    </span>
                  )}
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon-sm" onClick={() => setEditing(t)} aria-label={`Edit ${t.title}`}>
                      <Pencil />
                    </Button>
                    <Button variant="ghost" size="icon-sm" onClick={() => remove(t)} aria-label={`Delete ${t.title}`}>
                      <Trash2 />
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
        </Card>
      )}

      {suggesting && <SuggestTasksDialog eventId={event.id} existing={tasks} onClose={() => setSuggesting(false)} />}
      {editing && <EditTaskDialog task={editing} eventDate={event.eventDate} onClose={() => setEditing(null)} />}
    </div>
  )
}
