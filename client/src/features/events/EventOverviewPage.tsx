import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, ChevronDown, Clock, Compass, Lightbulb, Palette, Pencil, ShieldAlert, Sparkles, Trash2, Wallet } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState, LoadingBlock } from '@/components/QueryStates'
import { StatCard } from '@/components/StatCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { api, errorMessage } from '@/lib/api'
import { daysBetween, todayISO } from '@/lib/dates'
import { taskProgress } from '@/lib/insights'
import { formatMoney } from '@/lib/money'
import { keys, useBudget, usePlan, useTasks } from '@/lib/queries'
import { EditEventDialog } from './EditEventDialog'
import { GeneratePlan } from './GeneratePlan'
import { useEvent } from './useEvent'

function DeleteEventDialog({ eventId, name, onClose }: { eventId: string; name: string; onClose: () => void }) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const remove = useMutation({
    mutationFn: () => api.deleteEvent(eventId),
    onSuccess: async () => {
      qc.removeQueries({ queryKey: ['event', eventId] })
      await qc.invalidateQueries({ queryKey: keys.dashboard })
      toast.success(`Deleted ${name}`)
      navigate('/dashboard')
    },
    onError: (err) => toast.error(errorMessage(err)),
  })
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete this event?</DialogTitle>
          <DialogDescription>“{name}” and its plan, budget, checklist and conversation will be permanently deleted.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" onClick={() => remove.mutate()} disabled={remove.isPending}>
            {remove.isPending ? 'Deleting…' : 'Delete event'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function EventOverviewPage() {
  const event = useEvent()
  const plan = usePlan(event.id)
  const tasks = useTasks(event.id)
  const budget = useBudget(event.id)
  const [dialog, setDialog] = useState<'edit' | 'delete' | null>(null)

  const progress = taskProgress(tasks.data ?? [])
  const daysLeft = event.eventDate ? daysBetween(todayISO(), event.eventDate) : null
  const summary = budget.data?.summary
  const saved = plan.data

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => setDialog('edit')}>
          <Pencil aria-hidden="true" /> Edit details
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setDialog('delete')}>
          <Trash2 aria-hidden="true" /> Delete event
        </Button>
      </div>

      <section aria-label="Event status" className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={Clock} label="Days to go" value={daysLeft ?? '—'} hint={daysLeft === null ? 'Set a date to schedule tasks' : undefined} />
        <StatCard icon={CheckCircle2} label="Tasks done" value={`${progress.done}/${progress.total}`} hint={`${progress.percent}% complete`} tone="coral" />
        <StatCard
          icon={Wallet}
          label="Allocated"
          value={summary ? formatMoney(summary.estimatedMinor, event.currency) : '—'}
          hint={summary?.overrunMinor ? `Over by ${formatMoney(summary.overrunMinor, event.currency)}` : `of ${formatMoney(event.budgetMinor, event.currency)}`}
          tone="gold"
        />
      </section>

      {plan.isPending ? (
        <LoadingBlock rows={3} label="Loading plan" />
      ) : plan.error ? (
        <ErrorState error={plan.error} onRetry={() => plan.refetch()} />
      ) : !saved ? (
        <EmptyState
          icon={Sparkles}
          title="No plan yet"
          description="CelebrAI will check what’s missing, then build a theme, budget split, checklist, timeline and risks — explaining each choice."
          action={
            <div className="flex flex-col items-center gap-3">
              <GeneratePlan eventId={event.id} />
              <Link to="planner" className="text-sm text-primary underline underline-offset-2">
                Or describe your event to the assistant
              </Link>
            </div>
          }
        />
      ) : (
        <>
          <Card className="gap-4 p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">Plan summary</h2>
              <Badge variant="secondary">Version {saved.version}</Badge>
            </div>
            <p>{saved.plan.summary}</p>
            <div className="rounded-2xl bg-secondary p-4 text-secondary-foreground">
              <p className="flex items-center gap-2 font-semibold">
                <Palette className="size-4" aria-hidden="true" /> Theme: {saved.plan.theme.name}
              </p>
              <p className="mt-1">{saved.plan.theme.description}</p>
              <p className="mt-2 text-sm">
                <span className="font-medium">Why this theme:</span> {saved.plan.theme.reasoning}
              </p>
            </div>
          </Card>

          {saved.plan.decisions.length > 0 && (
            <Card className="gap-3 p-6">
              <h2 className="flex items-center gap-2 font-semibold">
                <Compass className="size-4 text-primary" aria-hidden="true" /> How CelebrAI decided
              </h2>
              <ul className="grid gap-3 sm:grid-cols-2">
                {saved.plan.decisions.map((d) => (
                  <li key={d.rule} className="rounded-xl border p-3 text-sm">
                    <p className="font-medium">{d.rule}</p>
                    <p className="text-muted-foreground">{d.detail}</p>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <section aria-labelledby="recs-heading">
            <h2 id="recs-heading" className="mb-3 text-lg font-semibold">Recommendations</h2>
            <ul className="grid gap-4 md:grid-cols-2">
              {saved.plan.recommendations.map((r) => (
                <li key={r.category + r.recommendation}>
                  <Card className="h-full gap-3 p-5">
                    <div className="flex items-start justify-between gap-2">
                      <Badge variant="outline">{r.category}</Badge>
                      {r.estimatedCostMinor !== null && (
                        <span className="text-sm font-medium">
                          ≈ {formatMoney(r.estimatedCostMinor, event.currency)} <span className="sr-only">estimated</span>
                        </span>
                      )}
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
                {saved.plan.risks.map((r) => (
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
                {saved.plan.assumptions.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </Card>
          </div>

          <GeneratePlan eventId={event.id} regenerate />
        </>
      )}

      {dialog === 'edit' && <EditEventDialog event={event} onClose={() => setDialog(null)} />}
      {dialog === 'delete' && <DeleteEventDialog eventId={event.id} name={event.eventName} onClose={() => setDialog(null)} />}
    </div>
  )
}
