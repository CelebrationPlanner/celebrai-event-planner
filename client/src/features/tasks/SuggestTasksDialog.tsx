import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { ErrorState, LoadingBlock } from '@/components/QueryStates'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { api, errorMessage } from '@/lib/api'
import { formatDate } from '@/lib/dates'
import { useRefreshEvent, useSuggestions } from '@/lib/queries'
import type { Task } from '@/types'

/** Automatic task generation without AI: the engine proposes, the user picks, one bulk insert saves. */
export function SuggestTasksDialog({ eventId, existing, onClose }: { eventId: string; existing: Task[]; onClose: () => void }) {
  const suggestions = useSuggestions(eventId, true)
  const refresh = useRefreshEvent()
  const have = new Set(existing.map((t) => t.title.toLowerCase()))
  const fresh = (suggestions.data?.tasks ?? []).filter((t) => !have.has(t.title.toLowerCase()))
  const [skipped, setSkipped] = useState<Set<string>>(new Set())
  const chosen = fresh.filter((t) => !skipped.has(t.title))

  const add = useMutation({
    mutationFn: () => api.createTasks(eventId, chosen),
    onSuccess: async (created) => {
      await refresh(eventId)
      toast.success(`Added ${created.length} task${created.length === 1 ? '' : 's'}`)
      onClose()
    },
    onError: (err) => toast.error(errorMessage(err)),
  })
  const toggle = (title: string) => setSkipped((s) => (s.delete(title) ? new Set(s) : new Set(s).add(title)))

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Suggested tasks</DialogTitle>
          <DialogDescription>Based on your event’s date, guests, venue and needs. Deadlines are never in the past or after the event.</DialogDescription>
        </DialogHeader>

        {suggestions.isPending ? (
          <LoadingBlock rows={4} label="Finding tasks" />
        ) : suggestions.error ? (
          <ErrorState error={suggestions.error} onRetry={() => suggestions.refetch()} />
        ) : fresh.length === 0 ? (
          <p className="text-sm text-muted-foreground">You already have every suggested task.</p>
        ) : (
          <ul className="flex flex-col gap-2" aria-label="Suggested tasks">
            {fresh.map((t) => (
              <li key={t.title} className="flex items-center gap-3 rounded-lg border p-3">
                <Checkbox id={`suggest-${t.title}`} checked={!skipped.has(t.title)} onCheckedChange={() => toggle(t.title)} />
                <label htmlFor={`suggest-${t.title}`} className="flex-1 cursor-pointer text-sm">
                  {t.title}
                  <span className="block text-xs text-muted-foreground">{t.dueDate ? `Due ${formatDate(t.dueDate, { day: 'numeric', month: 'short' })}` : 'No date yet'}</span>
                </label>
                <Badge variant="outline" className="capitalize">{t.priority}</Badge>
              </li>
            ))}
          </ul>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => add.mutate()} disabled={chosen.length === 0 || add.isPending}>
            {add.isPending ? 'Adding…' : `Add ${chosen.length} task${chosen.length === 1 ? '' : 's'}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
