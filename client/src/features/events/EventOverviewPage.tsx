import { CheckCircle2, ChevronDown, Clock, Lightbulb, Palette, ShieldAlert, Sparkles, Wallet } from 'lucide-react'
import { Link } from 'react-router'
import { EmptyState } from '@/components/EmptyState'
import { StatCard } from '@/components/StatCard'
import { UnavailableAction } from '@/components/UnavailableAction'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useDemoStore } from '@/demo/DemoStore'
import { daysBetween, todayISO } from '@/lib/dates'
import { summarizeBudget, taskProgress } from '@/lib/insights'
import { formatMoney } from '@/lib/money'
import { AI_PENDING_REASON } from '@/lib/pending'
import { useEvent } from './useEvent'


export default function EventOverviewPage() {
  const event = useEvent()
  const { plans, tasks, expenses } = useDemoStore()
  const plan = plans.find((p) => p.eventId === event.id)
  const progress = taskProgress(tasks.filter((t) => t.eventId === event.id))
  const budget = summarizeBudget(event.budgetMinor, expenses.filter((x) => x.eventId === event.id))
  const daysLeft = event.eventDate ? daysBetween(todayISO(), event.eventDate) : null

  return (
    <div className="flex flex-col gap-6">
      <section aria-label="Event status" className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={Clock} label="Days to go" value={daysLeft ?? '—'} hint={daysLeft === null ? 'Set a date to schedule tasks' : undefined} />
        <StatCard icon={CheckCircle2} label="Tasks done" value={`${progress.done}/${progress.total}`} hint={`${progress.percent}% complete`} tone="coral" />
        <StatCard
          icon={Wallet}
          label="Allocated"
          value={formatMoney(budget.estimatedMinor, event.currency)}
          hint={budget.overrunMinor ? `Over by ${formatMoney(budget.overrunMinor, event.currency)}` : `of ${formatMoney(event.budgetMinor, event.currency)}`}
          tone="gold"
        />
      </section>

      {!plan ? (
        <EmptyState
          icon={Sparkles}
          title="No plan yet"
          description="Chat with the assistant about this event. It will ask for anything missing, then generate a theme, budget, checklist, timeline and invitation."
          action={
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
              <Button variant="outline" asChild>
                <Link to="planner">Open the assistant</Link>
              </Button>
              <UnavailableAction icon={Sparkles} label="Generate plan" reason={AI_PENDING_REASON} />
            </div>
          }
        />
      ) : (
        <>
          <Card className="gap-4 p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">Plan summary</h2>
              <Badge variant="secondary">Version {plan.version}</Badge>
            </div>
            <p>{plan.summary}</p>
            <div className="rounded-2xl bg-secondary p-4 text-secondary-foreground">
              <p className="flex items-center gap-2 font-semibold">
                <Palette className="size-4" aria-hidden="true" /> Theme: {plan.theme.name}
              </p>
              <p className="mt-1">{plan.theme.description}</p>
              <p className="mt-2 text-sm">
                <span className="font-medium">Why this theme:</span> {plan.theme.reasoning}
              </p>
            </div>
          </Card>

          <section aria-labelledby="recs-heading">
            <h2 id="recs-heading" className="mb-3 text-lg font-semibold">Recommendations</h2>
            <ul className="grid gap-4 md:grid-cols-2">
              {plan.recommendations.map((r) => (
                <li key={r.category}>
                  <Card className="h-full gap-3 p-5">
                    <div className="flex items-start justify-between gap-2">
                      <Badge variant="outline">{r.category}</Badge>
                      {r.estimatedCostMinor !== null && <span className="text-sm font-medium">≈ {formatMoney(r.estimatedCostMinor, event.currency)}</span>}
                    </div>
                    <p className="font-medium">{r.recommendation}</p>
                    <p className="text-sm text-muted-foreground">{r.explanation}</p>
                    <details className="group text-sm">
                      <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded font-medium text-primary focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
                        Why? <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden="true" />
                      </summary>
                      <p className="mt-2">{r.reasoning}</p>
                      {r.assumptions.length > 0 && (
                        <ul className="mt-2 list-disc pl-5 text-muted-foreground">
                          {r.assumptions.map((a) => (
                            <li key={a}>{a}</li>
                          ))}
                        </ul>
                      )}
                    </details>
                  </Card>
                </li>
              ))}
            </ul>
          </section>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="gap-3 p-5">
              <h2 className="flex items-center gap-2 font-semibold">
                <ShieldAlert className="size-4 text-coral" aria-hidden="true" /> Risks & contingencies
              </h2>
              <ul className="flex flex-col gap-3 text-sm">
                {plan.risks.map((r) => (
                  <li key={r.issue}>
                    <p className="font-medium">{r.issue}</p>
                    <p className="text-muted-foreground">{r.mitigation}</p>
                  </li>
                ))}
              </ul>
            </Card>
            <Card className="gap-3 p-5">
              <h2 className="flex items-center gap-2 font-semibold">
                <Lightbulb className="size-4 text-gold" aria-hidden="true" /> Assumptions
              </h2>
              <ul className="list-disc pl-5 text-sm text-muted-foreground">
                {plan.assumptions.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </Card>
          </div>

          <UnavailableAction icon={Sparkles} label="Regenerate plan" reason={AI_PENDING_REASON} />
        </>
      )}
    </div>
  )
}
