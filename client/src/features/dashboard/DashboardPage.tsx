import { CalendarDays, CalendarPlus, CheckCircle2, CircleDashed, History, MapPin, PartyPopper, Users, Wallet } from 'lucide-react'
import { Link } from 'react-router'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { StatCard } from '@/components/StatCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { useDemoStore } from '@/demo/DemoStore'
import { formatDate, relativeDays, todayISO } from '@/lib/dates'
import { taskProgress } from '@/lib/insights'
import { formatMoney } from '@/lib/money'
import type { CurrencyCode } from '@/types'

function NewEventButton() {
  return (
    <Button asChild>
      <Link to="/events/new">
        <CalendarPlus aria-hidden="true" /> Create event
      </Link>
    </Button>
  )
}

export default function DashboardPage() {
  const { events, tasks, activity, profile } = useDemoStore()
  const today = todayISO()

  if (events.length === 0) {
    return (
      <>
        <PageHeader title={`Hello, ${profile.name}`} description="Let’s plan something worth celebrating." />
        <EmptyState
          icon={PartyPopper}
          title="No events yet"
          description="Create your first event, or describe it to the AI assistant and let it fill in the details."
          action={<NewEventButton />}
        />
      </>
    )
  }

  const upcoming = events
    .filter((e) => !e.eventDate || e.eventDate >= today)
    .sort((a, b) => (a.eventDate ?? '9999').localeCompare(b.eventDate ?? '9999'))
  const budgetByCurrency = events.reduce<Partial<Record<CurrencyCode, number>>>((acc, e) => ({ ...acc, [e.currency]: (acc[e.currency] ?? 0) + e.budgetMinor }), {})
  const totalBudget = Object.entries(budgetByCurrency)
    .map(([c, v]) => formatMoney(v, c as CurrencyCode))
    .join(' · ')
  const active = tasks.filter((t) => !t.completed).length

  return (
    <>
      <PageHeader title={`Hello, ${profile.name}`} description="Here’s where your celebrations stand." actions={<NewEventButton />} />

      <section aria-label="Summary" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={CalendarDays} label="Upcoming events" value={upcoming.length} />
        <StatCard icon={Wallet} label="Total planned budget" value={totalBudget} tone="gold" />
        <StatCard icon={CircleDashed} label="Active tasks" value={active} tone="coral" />
        <StatCard icon={CheckCircle2} label="Completed tasks" value={tasks.length - active} />
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-[2fr_1fr]">
        <section aria-labelledby="upcoming-heading">
          <h2 id="upcoming-heading" className="mb-3 text-lg font-semibold">Upcoming events</h2>
          <ul className="flex flex-col gap-3">
            {upcoming.map((e) => {
              const progress = taskProgress(tasks.filter((t) => t.eventId === e.id))
              return (
                <li key={e.id}>
                  <Card className="gap-3 p-5 transition-shadow hover:shadow-md">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <Link to={`/events/${e.id}`} className="font-semibold hover:text-primary focus-visible:underline focus-visible:outline-none">
                          {e.eventName}
                        </Link>
                        <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <CalendarDays className="size-3.5" aria-hidden="true" />
                            {e.eventDate ? formatDate(e.eventDate) : 'Date not set'}
                          </span>
                          {e.location && (
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="size-3.5" aria-hidden="true" />
                              {e.location}
                            </span>
                          )}
                          {e.guestCount && (
                            <span className="inline-flex items-center gap-1">
                              <Users className="size-3.5" aria-hidden="true" />
                              {e.guestCount} guests
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {e.eventDate && <Badge variant="secondary">{relativeDays(e.eventDate, today)}</Badge>}
                        <Badge variant="outline" className="capitalize">{e.status}</Badge>
                      </div>
                    </div>
                    <div>
                      <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                        <span>Preparation progress</span>
                        <span>
                          {progress.done}/{progress.total} tasks · {progress.percent}%
                        </span>
                      </div>
                      <Progress value={progress.percent} aria-label={`${e.eventName} preparation progress`} />
                    </div>
                  </Card>
                </li>
              )
            })}
          </ul>
        </section>

        <section aria-labelledby="activity-heading">
          <h2 id="activity-heading" className="mb-3 text-lg font-semibold">Recent activity</h2>
          <Card className="p-5">
            {activity.length === 0 ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <History className="size-4" aria-hidden="true" /> Nothing yet — your changes will appear here.
              </p>
            ) : (
              <ul className="flex flex-col gap-3 text-sm">
                {activity.slice(0, 6).map((a) => (
                  <li key={a.id} className="flex gap-3">
                    <span className="mt-1.5 size-2 shrink-0 rounded-full bg-coral" aria-hidden="true" />
                    <span>{a.message}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </section>
      </div>
    </>
  )
}
