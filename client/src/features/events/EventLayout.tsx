import { ArrowLeft, CalendarDays, MapPin, SearchX, Users, Wallet } from 'lucide-react'
import { Link, NavLink, Outlet, useParams } from 'react-router'
import { EmptyState } from '@/components/EmptyState'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ErrorState, LoadingBlock } from '@/components/QueryStates'
import { ApiError } from '@/lib/api'
import { formatDate, relativeDays } from '@/lib/dates'
import { formatMoney } from '@/lib/money'
import { useEventQuery } from '@/lib/queries'

const TABS = [
  { to: '', label: 'Overview' },
  { to: 'planner', label: 'Assistant' },
  { to: 'budget', label: 'Budget' },
  { to: 'checklist', label: 'Checklist' },
  { to: 'timeline', label: 'Timeline' },
  { to: 'invitation', label: 'Invitation' },
]

export default function EventLayout() {
  const { eventId = '' } = useParams()
  const { data: event, isPending, error, refetch } = useEventQuery(eventId)

  if (isPending) return <LoadingBlock rows={4} label="Loading event" />
  if (error && !(error instanceof ApiError && error.status === 404)) return <ErrorState error={error} onRetry={() => refetch()} />
  if (!event) {
    return (
      <EmptyState
        icon={SearchX}
        title="Event not found"
        description="It may have been deleted, or the link is wrong."
        action={
          <Button asChild>
            <Link to="/dashboard">Back to dashboard</Link>
          </Button>
        }
      />
    )
  }

  return (
    <>
      <Link to="/dashboard" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden="true" /> Dashboard
      </Link>
      <header className="mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-heading text-3xl leading-tight sm:text-4xl">{event.eventName}</h1>
          <Badge variant="outline" className="capitalize">{event.status}</Badge>
        </div>
        <p className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="size-4" aria-hidden="true" />
            {event.eventDate ? `${formatDate(event.eventDate)} · ${relativeDays(event.eventDate)}` : 'Date not set'}
          </span>
          {event.location && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="size-4" aria-hidden="true" /> {event.location}
            </span>
          )}
          {event.guestCount && (
            <span className="inline-flex items-center gap-1.5">
              <Users className="size-4" aria-hidden="true" /> {event.guestCount} guests
            </span>
          )}
          <span className="inline-flex items-center gap-1.5">
            <Wallet className="size-4" aria-hidden="true" /> {formatMoney(event.budgetMinor, event.currency)}
          </span>
        </p>
      </header>

      <nav aria-label="Event sections" className="-mx-4 mb-6 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <ul className="flex w-max gap-1 rounded-xl bg-muted p-1">
          {TABS.map((t) => (
            <li key={t.label}>
              <NavLink
                to={t.to}
                end
                className={({ isActive }) =>
                  `block rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none ${
                    isActive ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  }`
                }
              >
                {t.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <Outlet context={event} />
    </>
  )
}
