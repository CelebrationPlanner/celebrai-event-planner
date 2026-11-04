import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card } from '@/components/ui/card'
import { categoryLabel, type Expense } from '@/types'

/** Estimated vs actual per category, with a text summary for screen readers (the chart itself is hidden). */
export function BudgetChart({
  expenses,
  largest,
  actualMinor,
  estimatedMinor,
  money,
}: {
  expenses: Expense[]
  largest: Expense | undefined
  actualMinor: number
  estimatedMinor: number
  money: (minor: number) => string
}) {
  const chartData = expenses.map((x) => ({
    label: categoryLabel(x.category),
    Estimated: x.estimatedMinor / 100,
    Actual: (x.actualMinor ?? 0) / 100,
  }))
  return (
    <Card className="gap-3 p-5">
      <h2 className="font-semibold">Estimated vs actual</h2>
      <figure>
        <div className="h-80" aria-hidden="true">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 8 }}>
              <CartesianGrid horizontal={false} stroke="var(--border)" />
              <XAxis type="number" tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
              <YAxis
                type="category"
                dataKey="label"
                width={110}
                tick={{ fontSize: 12 }}
                stroke="var(--muted-foreground)"
              />
              <Tooltip formatter={(v) => money(Math.round(Number(v) * 100))} cursor={{ fill: 'var(--muted)' }} />
              <Legend />
              <Bar dataKey="Estimated" fill="var(--chart-1)" radius={[0, 4, 4, 0]} />
              <Bar dataKey="Actual" fill="var(--chart-2)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <figcaption className="mt-2 text-sm text-muted-foreground">
          {largest && `Largest allocation: ${categoryLabel(largest.category)} at ${money(largest.estimatedMinor)}. `}
          {money(actualMinor)} spent so far of {money(estimatedMinor)} estimated.
        </figcaption>
      </figure>
    </Card>
  )
}
