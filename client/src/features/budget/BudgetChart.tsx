import { Card } from '@/components/ui/card'
import { categoryLabel, type Expense } from '@/types'

const SERIES = [
  { name: 'Estimated', color: 'var(--chart-1)' },
  { name: 'Actual', color: 'var(--chart-2)' },
]

/**
 * Estimated vs actual per category as plain CSS bars (no chart library). The bars are decorative;
 * the figcaption and the category list carry the same numbers for screen readers.
 */
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
  const max = Math.max(1, ...expenses.flatMap((x) => [x.estimatedMinor, x.actualMinor ?? 0]))
  const width = (minor: number) => `${(minor / max) * 100}%`
  return (
    <Card className="gap-3 p-5">
      <h2 className="font-semibold">Estimated vs actual</h2>
      <figure>
        <div aria-hidden="true">
          <ul className="flex flex-col gap-3">
            {expenses.map((x) => (
              <li key={x.id} className="grid grid-cols-[7rem_1fr] items-center gap-x-3 text-sm">
                <span className="row-span-2 truncate">{categoryLabel(x.category)}</span>
                {[x.estimatedMinor, x.actualMinor].map((value, i) => (
                  <div key={SERIES[i].name} className="flex items-center gap-2">
                    <div className="h-2.5 flex-1 rounded-full bg-muted">
                      <div
                        className="h-2.5 rounded-full"
                        style={{ width: width(value ?? 0), background: SERIES[i].color }}
                      />
                    </div>
                    <span className="w-24 text-xs text-muted-foreground">
                      {value === null ? 'not paid yet' : `${money(value)} ${i === 0 ? 'est.' : 'spent'}`}
                    </span>
                  </div>
                ))}
              </li>
            ))}
          </ul>
          <div className="mt-4 flex gap-4 text-xs text-muted-foreground">
            {SERIES.map((s) => (
              <span key={s.name} className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm" style={{ background: s.color }} /> {s.name}
              </span>
            ))}
          </div>
        </div>
        <figcaption className="mt-3 text-sm text-muted-foreground">
          {largest && `Largest allocation: ${categoryLabel(largest.category)} at ${money(largest.estimatedMinor)}. `}
          {money(actualMinor)} spent so far of {money(estimatedMinor)} estimated.
        </figcaption>
      </figure>
    </Card>
  )
}
