import { useMutation } from '@tanstack/react-query'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { api, errorMessage } from '@/lib/api'
import { useRefreshEvent } from '@/lib/queries'
import type { EventPlan } from '@/types'

type Item = EventPlan['schedule'][number]

/** Event-day agenda with in-place editing. Saving creates a new plan version on the server. */
export function ScheduleEditor({ eventId, schedule }: { eventId: string; schedule: Item[] }) {
  const refresh = useRefreshEvent()
  const [editing, setEditing] = useState(false)
  const [rows, setRows] = useState<Item[]>(schedule)
  const [error, setError] = useState<string>()
  const save = useMutation({
    mutationFn: (items: Item[]) => api.updateSchedule(eventId, items),
    onSuccess: async (saved) => {
      await refresh(eventId)
      setEditing(false)
      toast.success(`Schedule saved as plan version ${saved.version}`)
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  function startEditing() {
    setRows(schedule)
    setError(undefined)
    setEditing(true)
  }
  const update = (i: number, patch: Partial<Item>) =>
    setRows((r) => r.map((row, j) => (j === i ? { ...row, ...patch } : row)))

  function submit(e: FormEvent) {
    e.preventDefault()
    const items = rows.map((r) => ({ time: r.time, activity: r.activity.trim() }))
    if (items.some((r) => !/^([01]\d|2[0-3]):[0-5]\d$/.test(r.time) || !r.activity))
      return setError('Every item needs a time and an activity.')
    save.mutate(items)
  }

  if (!editing) {
    return (
      <Card className="gap-0 p-0">
        {schedule.length === 0 ? (
          <p className="px-5 py-4 text-sm text-muted-foreground">No agenda items yet.</p>
        ) : (
          <ol className="divide-y">
            {schedule.map((s, i) => (
              <li key={`${s.time}-${i}`} className="flex gap-4 px-5 py-3">
                <time className="w-14 shrink-0 font-semibold text-primary tabular-nums">{s.time}</time>
                <span className="text-sm">{s.activity}</span>
              </li>
            ))}
          </ol>
        )}
        <div className="border-t px-5 py-3">
          <Button variant="outline" size="sm" onClick={startEditing}>
            <Pencil aria-hidden="true" /> Edit schedule
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-5">
      <form onSubmit={submit} noValidate className="flex flex-col gap-3">
        <ul className="flex flex-col gap-2" aria-label="Agenda items">
          {rows.map((row, i) => (
            <li key={i} className="flex items-center gap-2">
              <Input
                type="time"
                aria-label={`Time for item ${i + 1}`}
                value={row.time}
                onChange={(e) => update(i, { time: e.target.value })}
                className="w-32"
              />
              <Input
                aria-label={`Activity for item ${i + 1}`}
                value={row.activity}
                maxLength={200}
                onChange={(e) => update(i, { activity: e.target.value })}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Remove item ${i + 1}`}
                onClick={() => setRows((r) => r.filter((_, j) => j !== i))}
              >
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={rows.length >= 20}
            onClick={() => setRows((r) => [...r, { time: '', activity: '' }])}
          >
            <Plus aria-hidden="true" /> Add item
          </Button>
          <span className="flex-1" />
          <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={save.isPending}>
            {save.isPending ? 'Saving…' : 'Save schedule'}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Items are sorted by time when saved. Regenerating the plan replaces this agenda.
        </p>
      </form>
    </Card>
  )
}
