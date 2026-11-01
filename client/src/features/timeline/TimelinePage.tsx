import { CalendarClock, Hammer, Mail, PartyPopper, ShoppingBag, Store } from 'lucide-react'
import { Link } from 'react-router'
import { EmptyState } from '@/components/EmptyState'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { ErrorState, LoadingBlock } from '@/components/QueryStates'
import { formatDate, relativeDays, todayISO } from '@/lib/dates'
import { usePlan, useProfile, useTasks } from '@/lib/queries'
import type { Task, TaskKind } from '@/types'
import { useEvent } from '../events/useEvent'
import { ScheduleEditor } from './ScheduleEditor'

const KIND: Record<TaskKind, { label: string; icon: typeof Store }> = {
  vendor: { label: 'Vendor deadline', icon: Store },
  invitation: { label: 'Invitations', icon: Mail },
  shopping: { label: 'Shopping', icon: ShoppingBag },
  preparation: { label: 'Preparation', icon: Hammer },
}

export default function TimelinePage() {
  const event = useEvent()
  const tasksQuery = useTasks(event.id)
  const planQuery = usePlan(event.id)
  const today = todayISO()
  // The server computes "today" in the profile time zone (D8); show that one.
  const timeZone = useProfile().data?.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone

  if (tasksQuery.isPending || planQuery.isPending) return <LoadingBlock rows={4} label="Loading timeline" />
  const failed = tasksQuery.error ?? planQuery.error
  if (failed) return <ErrorState error={failed} onRetry={() => Promise.all([tasksQuery.refetch(), planQuery.refetch()])} />

  const tasks = tasksQuery.data ?? []
  const plan = planQuery.data?.plan
  const dated = tasks.filter((t) => t.dueDate).sort((a, b) => a.dueDate!.localeCompare(b.dueDate!))
  const undated = tasks.filter((t) => !t.dueDate).length

  const byDate = new Map<string, Task[]>()
  for (const t of dated) byDate.set(t.dueDate!, [...(byDate.get(t.dueDate!) ?? []), t])

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section aria-labelledby="prep-heading">
        <h2 id="prep-heading" className="mb-3 text-lg font-semibold">Preparation milestones</h2>
        {dated.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title="No dated milestones"
            description={
              <>
                Add due dates to tasks in the <Link to="../checklist" className="text-primary underline">checklist</Link> to see them here.
              </>
            }
          />
        ) : (
          <Card className="p-5">
            <ol className="relative flex flex-col gap-6 border-l-2 border-secondary pl-6">
              {[...byDate].map(([date, items]) => (
                <li key={date} className="relative">
                  <span className="absolute top-1 -left-[1.95rem] size-3 rounded-full border-2 border-card bg-primary" aria-hidden="true" />
                  <p className="text-sm font-semibold">
                    {formatDate(date, { weekday: 'short', day: 'numeric', month: 'short' })}{' '}
                    <span className={`font-normal ${date < today ? 'text-destructive' : 'text-muted-foreground'}`}>· {relativeDays(date, today)}</span>
                  </p>
                  <ul className="mt-2 flex flex-col gap-2">
                    {items.map((t) => {
                      const { label, icon: Icon } = KIND[t.kind]
                      return (
                        <li key={t.id} className="flex items-start gap-2 text-sm">
                          <Icon className="mt-0.5 size-4 shrink-0 text-coral" aria-label={label} />
                          <span className={t.completed ? 'text-muted-foreground line-through' : ''}>{t.title}</span>
                          {t.completed && <Badge variant="secondary" className="ml-auto">Done</Badge>}
                        </li>
                      )
                    })}
                  </ul>
                </li>
              ))}
              {event.eventDate && (
                <li className="relative">
                  <span className="absolute top-1 -left-[1.95rem] size-3 rounded-full border-2 border-card bg-gold" aria-hidden="true" />
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    <PartyPopper className="size-4 text-gold" aria-hidden="true" /> Event day · {formatDate(event.eventDate)}
                  </p>
                </li>
              )}
            </ol>
            {undated > 0 && <p className="mt-4 text-xs text-muted-foreground">{undated} task(s) without a due date aren’t shown.</p>}
          </Card>
        )}
      </section>

      <section aria-labelledby="day-heading">
        <h2 id="day-heading" className="mb-3 text-lg font-semibold">Event-day schedule</h2>
        {!event.eventDate ? (
          <EmptyState icon={CalendarClock} title="Date not set" description="The assistant will ask for the date before building a date-specific schedule." />
        ) : !plan ? (
          <EmptyState icon={CalendarClock} title="No schedule yet" description="Generate a plan to get an hour-by-hour agenda for the day." />
        ) : (
          <ScheduleEditor key={planQuery.data?.version} eventId={event.id} schedule={plan.schedule} />
        )}
      </section>

      <p className="text-xs text-muted-foreground lg:col-span-2">
        <strong className="font-medium">How deadlines are set:</strong> each task gets a typical lead time before the event, worked out in your time zone ({timeZone}). Deadlines are never in
        the past or after the event; when time is short, bookings fall due today and are marked high priority.
      </p>
    </div>
  )
}
