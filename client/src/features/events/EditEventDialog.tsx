import { useMutation } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Field, selectClass } from '@/components/Field'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { api, errorMessage, fieldErrors } from '@/lib/api'
import { todayISO } from '@/lib/dates'
import { parseMoney, toMajorInput } from '@/lib/money'
import { useRefreshEvent } from '@/lib/queries'
import { OCCASIONS, type CelebrationEvent, type Occasion } from '@/types'

/** Edits the core event details. Validation is repeated on the server, which has the final say. */
export function EditEventDialog({ event, onClose }: { event: CelebrationEvent; onClose: () => void }) {
  const refresh = useRefreshEvent()
  const [v, setV] = useState({
    occasion: event.occasion ?? '',
    eventName: event.eventName,
    eventDate: event.eventDate ?? '',
    location: event.location,
    guestCount: event.guestCount ? String(event.guestCount) : '',
    budget: toMajorInput(event.budgetMinor),
    venuePreference: event.venuePreference,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const save = useMutation({
    mutationFn: () => {
      const budgetMinor = parseMoney(v.budget)
      const guests = v.guestCount === '' ? null : Number(v.guestCount)
      const local: Record<string, string> = {}
      if (v.eventName.trim().length < 1) local.eventName = 'Give your event a name.'
      if (budgetMinor === null) local.budgetMinor = 'Enter a non-negative amount (up to 2 decimals).'
      if (guests !== null && !(Number.isInteger(guests) && guests >= 1 && guests <= 5000)) local.guestCount = 'Guests must be between 1 and 5,000.'
      if (Object.keys(local).length) return Promise.reject(Object.assign(new Error('invalid'), { local }))
      return api.updateEvent(event.id, {
        occasion: (v.occasion || null) as Occasion | null,
        eventName: v.eventName.trim(),
        eventDate: v.eventDate || null,
        location: v.location.trim(),
        guestCount: guests,
        budgetMinor: budgetMinor!,
        venuePreference: v.venuePreference,
      })
    },
    onSuccess: async () => {
      await refresh(event.id)
      toast.success('Event updated', { description: 'Regenerate the plan to reflect the changes.' })
      onClose()
    },
    onError: (err: Error & { local?: Record<string, string> }) => {
      const found = err.local ?? fieldErrors(err)
      setErrors(found)
      if (!Object.keys(found).length) toast.error(errorMessage(err))
    },
  })
  const set = (key: keyof typeof v) => (e: { target: { value: string } }) => setV((s) => ({ ...s, [key]: e.target.value }))

  function submit(e: FormEvent) {
    e.preventDefault()
    save.mutate()
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <form onSubmit={submit} noValidate className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Edit event details</DialogTitle>
            <DialogDescription>Changes are saved to your event. Regenerate the plan afterwards to update it.</DialogDescription>
          </DialogHeader>
          <Field label="Occasion" error={errors.occasion}>
            {(p) => (
              <select {...p} className={selectClass} value={v.occasion} onChange={set('occasion')}>
                <option value="">Not decided</option>
                {OCCASIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            )}
          </Field>
          <Field label="Event name" error={errors.eventName}>
            {(p) => <Input {...p} value={v.eventName} onChange={set('eventName')} />}
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Date" error={errors.eventDate}>
              {(p) => <Input {...p} type="date" min={todayISO()} value={v.eventDate} onChange={set('eventDate')} />}
            </Field>
            <Field label="Location" error={errors.location}>
              {(p) => <Input {...p} value={v.location} onChange={set('location')} />}
            </Field>
            <Field label="Guest count" error={errors.guestCount}>
              {(p) => <Input {...p} inputMode="numeric" value={v.guestCount} onChange={set('guestCount')} />}
            </Field>
            <Field label={`Budget (${event.currency})`} error={errors.budgetMinor}>
              {(p) => <Input {...p} inputMode="decimal" value={v.budget} onChange={set('budget')} />}
            </Field>
          </div>
          <Field label="Venue preference">
            {(p) => (
              <select {...p} className={selectClass} value={v.venuePreference} onChange={set('venuePreference')}>
                <option value="indoor">Indoor</option>
                <option value="outdoor">Outdoor</option>
                <option value="flexible">Flexible</option>
              </select>
            )}
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
