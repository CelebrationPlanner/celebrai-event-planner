import { useMutation } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Field } from '@/components/Field'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { api, errorMessage } from '@/lib/api'
import { parseMoney, toMajorInput } from '@/lib/money'
import { useRefreshEvent } from '@/lib/queries'
import { categoryLabel, type CurrencyCode, type Expense } from '@/types'

export function EditExpenseDialog({
  eventId,
  expense,
  currency,
  onClose,
}: {
  eventId: string
  expense: Expense
  currency: CurrencyCode
  onClose: () => void
}) {
  const refresh = useRefreshEvent()
  const [estimated, setEstimated] = useState(toMajorInput(expense.estimatedMinor))
  const [actual, setActual] = useState(expense.actualMinor === null ? '' : toMajorInput(expense.actualMinor))
  const [errors, setErrors] = useState<{ estimated?: string; actual?: string }>({})
  const save = useMutation({
    mutationFn: (line: Pick<Expense, 'category' | 'estimatedMinor' | 'actualMinor'>) =>
      api.updateBudget(eventId, [line]),
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
    if (!next.estimated && !next.actual)
      save.mutate({ category: expense.category, estimatedMinor: estimatedMinor!, actualMinor })
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
              {(p) => (
                <Input
                  {...p}
                  inputMode="decimal"
                  value={estimated}
                  onChange={(e) => setEstimated(e.target.value)}
                  autoFocus
                />
              )}
            </Field>
            <Field label="Actual spent" error={errors.actual}>
              {(p) => <Input {...p} inputMode="decimal" value={actual} onChange={(e) => setActual(e.target.value)} />}
            </Field>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
