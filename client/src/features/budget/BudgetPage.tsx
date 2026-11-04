import { useMutation } from '@tanstack/react-query'
import { Lightbulb, PiggyBank, Receipt, Scale, TriangleAlert, Wallet } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState, LoadingBlock } from '@/components/QueryStates'
import { StatCard } from '@/components/StatCard'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { api, errorMessage } from '@/lib/api'
import { formatMoney } from '@/lib/money'
import { useBudget, useRefreshEvent } from '@/lib/queries'
import { BUDGET_CATEGORIES, categoryLabel, type Expense } from '@/types'
import { useEvent } from '../events/useEvent'
import { BudgetChart } from './BudgetChart'
import { EditExpenseDialog } from './EditExpenseDialog'
import { SuggestedSplitDialog } from './SuggestedSplitDialog'

export default function BudgetPage() {
  const event = useEvent()
  const { data, isPending, error, refetch } = useBudget(event.id)
  const refresh = useRefreshEvent()
  const [editing, setEditing] = useState<Expense | null>(null)
  const [suggesting, setSuggesting] = useState(false)
  const money = (minor: number) => formatMoney(minor, event.currency)
  const setUp = useMutation({
    mutationFn: () =>
      api.updateBudget(
        event.id,
        BUDGET_CATEGORIES.map((c) => ({ category: c.value, estimatedMinor: 0, actualMinor: null })),
      ),
    onSuccess: () => refresh(event.id),
    onError: (err) => toast.error(errorMessage(err)),
  })

  if (isPending) return <LoadingBlock rows={4} label="Loading budget" />
  if (error) return <ErrorState error={error} onRetry={() => refetch()} />

  const { expenses, summary } = data
  const suggestDialog = suggesting && (
    <SuggestedSplitDialog event={event} current={expenses} onClose={() => setSuggesting(false)} />
  )
  if (expenses.length === 0) {
    return (
      <>
        <EmptyState
          icon={Wallet}
          title="No budget breakdown yet"
          description={
            `Your total budget is ${money(event.budgetMinor)}. Get an instant split across venue, ` +
            `food, décor and more — with the reasoning for each — or fill in the categories yourself.`
          }
          action={
            <div className="flex flex-col items-center gap-3">
              <Button onClick={() => setSuggesting(true)} disabled={!event.budgetMinor}>
                <Scale aria-hidden="true" /> Use suggested split
              </Button>
              <Button variant="outline" onClick={() => setUp.mutate()} disabled={setUp.isPending}>
                Set up categories manually
              </Button>
            </div>
          }
        />
        {suggestDialog}
      </>
    )
  }

  // All totals, remaining and overrun come from the server (integer minor units).
  const largest = [...expenses]
    .filter((x) => x.category !== 'contingency')
    .sort((a, b) => b.estimatedMinor - a.estimatedMinor)
  const ideas = summary.overrunMinor
    ? largest
        .slice(0, 2)
        .map(
          (x) =>
            `Trim ${categoryLabel(x.category)} (${money(x.estimatedMinor)}) — your largest ` +
            `categories give the most room to close the ${money(summary.overrunMinor)} gap.`,
        )
    : summary.remainingMinor
      ? [`${money(summary.remainingMinor)} is unallocated. Add it to contingency or keep it as savings.`]
      : ['Your whole budget is allocated. Keep the contingency untouched until the final week.']
  const warnings = summary.warnings.map((w) =>
    w.kind === 'overrun'
      ? `Planned allocations exceed the total budget by ${money(w.amountMinor)}. Reduce a category or increase the budget.`
      : w.kind === 'over_estimate'
        ? `${categoryLabel(w.category)} spending is above its estimate.`
        : 'No contingency set aside. Around 10% protects against last-minute costs.',
  )

  return (
    <div className="flex flex-col gap-6">
      <section aria-label="Budget totals" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Wallet} label="Total budget" value={money(summary.budgetMinor)} />
        <StatCard icon={Receipt} label="Estimated" value={money(summary.estimatedMinor)} tone="gold" />
        <StatCard icon={PiggyBank} label="Actual spent" value={money(summary.actualMinor)} tone="coral" />
        <StatCard
          icon={summary.overrunMinor ? TriangleAlert : Wallet}
          label={summary.overrunMinor ? 'Over budget by' : 'Unallocated'}
          value={
            <span className={summary.overrunMinor ? 'text-destructive' : undefined}>
              {money(summary.overrunMinor || summary.remainingMinor)}
            </span>
          }
        />
      </section>

      {warnings.length > 0 && (
        <Alert variant={summary.overrunMinor ? 'destructive' : 'default'}>
          <TriangleAlert aria-hidden="true" />
          <AlertTitle>{summary.overrunMinor ? 'Budget overrun' : 'Budget notes'}</AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-4">
              {warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <BudgetChart
          expenses={expenses}
          largest={largest[0]}
          actualMinor={summary.actualMinor}
          estimatedMinor={summary.estimatedMinor}
          money={money}
        />

        <Card className="gap-3 p-5">
          <h2 className="flex items-center gap-2 font-semibold">
            <Lightbulb className="size-4 text-gold" aria-hidden="true" /> Cost-saving ideas
          </h2>
          <ul className="flex flex-col gap-2 text-sm">
            {ideas.map((i) => (
              <li key={i}>{i}</li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">All costs are estimates, not vendor quotations.</p>
        </Card>
      </div>

      <Card className="gap-0 p-0">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b px-5 py-3">
          <h2 className="font-semibold">Categories</h2>
          <Button variant="outline" size="sm" onClick={() => setSuggesting(true)}>
            <Scale aria-hidden="true" /> Compare with suggested split
          </Button>
        </div>
        <ul className="divide-y">
          {expenses.map((x) => {
            const pct = summary.budgetMinor ? Math.round((x.estimatedMinor / summary.budgetMinor) * 100) : 0
            const over = x.actualMinor !== null && x.actualMinor > x.estimatedMinor
            return (
              <li key={x.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3">
                <span className="min-w-36 flex-1 font-medium">{categoryLabel(x.category)}</span>
                <span className="w-28 text-sm">
                  <span className="sr-only">Estimated </span>
                  {money(x.estimatedMinor)} <span className="text-muted-foreground">· {pct}%</span>
                </span>
                <span className={`w-32 text-sm ${over ? 'font-medium text-destructive' : 'text-muted-foreground'}`}>
                  {x.actualMinor === null ? 'Not paid yet' : `Spent ${money(x.actualMinor)}`}
                  {over && <span className="sr-only"> (over estimate)</span>}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditing(x)}
                  aria-label={`Edit ${categoryLabel(x.category)}`}
                >
                  Edit
                </Button>
              </li>
            )
          })}
        </ul>
      </Card>

      {suggestDialog}
      {editing && (
        <EditExpenseDialog
          eventId={event.id}
          expense={editing}
          currency={event.currency}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}
