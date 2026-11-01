import { useMutation } from '@tanstack/react-query'
import { Lightbulb, PiggyBank, Receipt, TriangleAlert, Wallet } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { toast } from 'sonner'
import { EmptyState } from '@/components/EmptyState'
import { Field } from '@/components/Field'
import { ErrorState, LoadingBlock } from '@/components/QueryStates'
import { StatCard } from '@/components/StatCard'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { api, errorMessage } from '@/lib/api'
import { formatMoney, parseMoney, toMajorInput } from '@/lib/money'
import { useBudget, useRefreshEvent } from '@/lib/queries'
import { BUDGET_CATEGORIES, categoryLabel, type CurrencyCode, type Expense } from '@/types'
import { GeneratePlan } from '../events/GeneratePlan'
import { useEvent } from '../events/useEvent'

function EditExpenseDialog({ eventId, expense, currency, onClose }: { eventId: string; expense: Expense; currency: CurrencyCode; onClose: () => void }) {
  const refresh = useRefreshEvent()
  const [estimated, setEstimated] = useState(toMajorInput(expense.estimatedMinor))
  const [actual, setActual] = useState(expense.actualMinor === null ? '' : toMajorInput(expense.actualMinor))
  const [errors, setErrors] = useState<{ estimated?: string; actual?: string }>({})
  const save = useMutation({
    mutationFn: (line: Pick<Expense, 'category' | 'estimatedMinor' | 'actualMinor'>) => api.updateBudget(eventId, [line]),
    onSuccess: async () => {
      await refresh(eventId)
      toast.success(`${categoryLabel(expense.category)} updated`)
      onClose()
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  function submit(e: FormEvent) {
    e.preventDefault()
    const estimatedMinor = parseMoney(estimated)
    const actualMinor = actual.trim() === '' ? null : parseMoney(actual)
    const next = {
      estimated: estimatedMinor === null ? 'Enter a non-negative amount (up to 2 decimals).' : undefined,
      actual: actual.trim() !== '' && actualMinor === null ? 'Enter a non-negative amount, or leave blank.' : undefined,
    }
    setErrors(next)
    if (!next.estimated && !next.actual) save.mutate({ category: expense.category, estimatedMinor: estimatedMinor!, actualMinor })
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <form onSubmit={submit} noValidate>
          <DialogHeader>
            <DialogTitle>Edit {categoryLabel(expense.category)}</DialogTitle>
            <DialogDescription>Amounts in {currency}. Leave “Actual spent” blank until you’ve paid.</DialogDescription>
          </DialogHeader>
          <div className="my-5 grid gap-4 sm:grid-cols-2">
            <Field label="Estimated" error={errors.estimated}>
              {(p) => <Input {...p} inputMode="decimal" value={estimated} onChange={(e) => setEstimated(e.target.value)} autoFocus />}
            </Field>
            <Field label="Actual spent" error={errors.actual}>
              {(p) => <Input {...p} inputMode="decimal" value={actual} onChange={(e) => setActual(e.target.value)} />}
            </Field>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function BudgetPage() {
  const event = useEvent()
  const { data, isPending, error, refetch } = useBudget(event.id)
  const refresh = useRefreshEvent()
  const [editing, setEditing] = useState<Expense | null>(null)
  const money = (minor: number) => formatMoney(minor, event.currency)
  const setUp = useMutation({
    mutationFn: () => api.updateBudget(event.id, BUDGET_CATEGORIES.map((c) => ({ category: c.value, estimatedMinor: 0, actualMinor: null }))),
    onSuccess: () => refresh(event.id),
    onError: (err) => toast.error(errorMessage(err)),
  })

  if (isPending) return <LoadingBlock rows={4} label="Loading budget" />
  if (error) return <ErrorState error={error} onRetry={() => refetch()} />

  const { expenses, summary } = data
  if (expenses.length === 0) {
    return (
      <EmptyState
        icon={Wallet}
        title="No budget breakdown yet"
        description={`Your total budget is ${money(event.budgetMinor)}. Generating a plan splits it across venue, food, décor and more — with the reasoning for each — or you can fill in the categories yourself.`}
        action={
          <div className="flex flex-col items-center gap-3">
            <GeneratePlan eventId={event.id} />
            <Button variant="outline" onClick={() => setUp.mutate()} disabled={setUp.isPending}>
              Set up categories manually
            </Button>
          </div>
        }
      />
    )
  }

  // All totals, remaining and overrun come from the server (integer minor units).
  const largest = [...expenses].filter((x) => x.category !== 'contingency').sort((a, b) => b.estimatedMinor - a.estimatedMinor)
  const chartData = expenses.map((x) => ({ label: categoryLabel(x.category), Estimated: x.estimatedMinor / 100, Actual: (x.actualMinor ?? 0) / 100 }))
  const ideas = summary.overrunMinor
    ? largest.slice(0, 2).map((x) => `Trim ${categoryLabel(x.category)} (${money(x.estimatedMinor)}) — your largest categories give the most room to close the ${money(summary.overrunMinor)} gap.`)
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
          value={<span className={summary.overrunMinor ? 'text-destructive' : undefined}>{money(summary.overrunMinor || summary.remainingMinor)}</span>}
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
        <Card className="gap-3 p-5">
          <h2 className="font-semibold">Estimated vs actual</h2>
          <figure>
            <div className="h-80" aria-hidden="true">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 8 }}>
                  <CartesianGrid horizontal={false} stroke="var(--border)" />
                  <XAxis type="number" tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
                  <YAxis type="category" dataKey="label" width={110} tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
                  <Tooltip formatter={(v) => money(Math.round(Number(v) * 100))} cursor={{ fill: 'var(--muted)' }} />
                  <Legend />
                  <Bar dataKey="Estimated" fill="var(--chart-1)" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="Actual" fill="var(--chart-2)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <figcaption className="mt-2 text-sm text-muted-foreground">
              {largest[0] && `Largest allocation: ${categoryLabel(largest[0].category)} at ${money(largest[0].estimatedMinor)}. `}
              {money(summary.actualMinor)} spent so far of {money(summary.estimatedMinor)} estimated.
            </figcaption>
          </figure>
        </Card>

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
        <h2 className="border-b px-5 py-4 font-semibold">Categories</h2>
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
                <Button variant="outline" size="sm" onClick={() => setEditing(x)} aria-label={`Edit ${categoryLabel(x.category)}`}>
                  Edit
                </Button>
              </li>
            )
          })}
        </ul>
      </Card>

      {editing && <EditExpenseDialog eventId={event.id} expense={editing} currency={event.currency} onClose={() => setEditing(null)} />}
    </div>
  )
}
