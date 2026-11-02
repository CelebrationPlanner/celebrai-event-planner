import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ErrorState, LoadingBlock } from '@/components/QueryStates'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { api, errorMessage } from '@/lib/api'
import { formatMoney } from '@/lib/money'
import { useRefreshEvent, useSuggestions } from '@/lib/queries'
import { categoryLabel, type CelebrationEvent, type Expense } from '@/types'

/**
 * Reallocation needs the user's review: shows the engine's split next to the current one,
 * with the reason for each category, and applies it only on confirmation. Actual spend is kept.
 */
export function SuggestedSplitDialog({
  event,
  current,
  onClose,
}: {
  event: CelebrationEvent
  current: Expense[]
  onClose: () => void
}) {
  const suggestions = useSuggestions(event.id, true)
  const refresh = useRefreshEvent()
  const money = (minor: number) => formatMoney(minor, event.currency)
  const apply = useMutation({
    mutationFn: (lines: NonNullable<typeof suggestions.data>['budget']) =>
      api.updateBudget(
        event.id,
        lines.map((l) => ({
          category: l.category,
          estimatedMinor: l.amountMinor,
          actualMinor: current.find((x) => x.category === l.category)?.actualMinor ?? null,
        })),
      ),
    onSuccess: async () => {
      await refresh(event.id)
      toast.success('Suggested split applied')
      onClose()
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  const lines = suggestions.data?.budget ?? []
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Suggested budget split</DialogTitle>
          <DialogDescription>
            Calculated by CelebrAI’s planning rules for this event — no AI involved. Review it before applying; nothing
            changes until you do.
          </DialogDescription>
        </DialogHeader>

        {suggestions.isPending ? (
          <LoadingBlock rows={4} label="Calculating suggestion" />
        ) : suggestions.error ? (
          <ErrorState error={suggestions.error} onRetry={() => suggestions.refetch()} />
        ) : lines.length === 0 ? (
          <p className="text-sm text-muted-foreground">Set a total budget for this event first.</p>
        ) : (
          <>
            {suggestions.data.decisions.length > 0 && (
              <ul className="flex flex-wrap gap-2" aria-label="Rules applied">
                {suggestions.data.decisions.map((d) => (
                  <li
                    key={d.rule}
                    className="rounded-full bg-secondary px-3 py-1 text-xs text-secondary-foreground"
                    title={d.detail}
                  >
                    {d.rule}
                  </li>
                ))}
              </ul>
            )}
            <table className="w-full text-sm">
              <caption className="sr-only">Current and suggested amount for each category</caption>
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th scope="col" className="py-2 font-medium">
                    Category
                  </th>
                  <th scope="col" className="py-2 pl-4 text-right font-medium">
                    Current
                  </th>
                  <th scope="col" className="py-2 pl-4 text-right font-medium">
                    Suggested
                  </th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l) => {
                  const now = current.find((x) => x.category === l.category)?.estimatedMinor
                  return (
                    <tr key={l.category} className="border-b align-top last:border-0">
                      <th scope="row" className="py-2 pr-3 text-left font-normal">
                        <span className="font-medium">{categoryLabel(l.category)}</span>
                        <span className="block text-xs text-muted-foreground">{l.reasoning}</span>
                      </th>
                      <td className="py-2 pl-4 text-right whitespace-nowrap text-muted-foreground">
                        {now === undefined ? '—' : money(now)}
                      </td>
                      <td className="py-2 pl-4 text-right font-medium whitespace-nowrap">{money(l.amountMinor)}</td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row" className="pt-3 text-left">
                    Total
                  </th>
                  <td className="pt-3 text-right text-muted-foreground">
                    {current.length ? money(current.reduce((s, x) => s + x.estimatedMinor, 0)) : '—'}
                  </td>
                  <td className="pt-3 text-right font-semibold">
                    {money(lines.reduce((s, l) => s + l.amountMinor, 0))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => apply.mutate(lines)} disabled={lines.length === 0 || apply.isPending}>
            {apply.isPending ? 'Applying…' : 'Apply this split'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
