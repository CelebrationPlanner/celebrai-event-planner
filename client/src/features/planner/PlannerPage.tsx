import { Bot, CircleCheck, CircleHelp, Send, User } from 'lucide-react'
import { useId, useState } from 'react'
import { useParams } from 'react-router'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useDemoStore } from '@/demo/DemoStore'
import { formatDate } from '@/lib/dates'
import { missingFields } from '@/lib/insights'
import { formatMoney } from '@/lib/money'
import { AI_PENDING_REASON } from '@/lib/pending'
import { OCCASIONS, type CelebrationEvent } from '@/types'

const MAX_INPUT = 2000
const EXAMPLES = [
  "My daughter's 5th birthday in Pune for 40 guests, ₹25,000 budget, princess theme, in 12 days.",
  'A 10th anniversary dinner for 20 people in Mumbai next month, budget ₹15,000.',
  'Office Diwali celebration for 60 colleagues, some vegan and Jain.',
]

function KnownContext({ event }: { event: CelebrationEvent }) {
  const known: Array<[string, string | null]> = [
    ['Occasion', OCCASIONS.find((o) => o.value === event.occasion)?.label ?? null],
    ['Date', event.eventDate ? formatDate(event.eventDate) : null],
    ['Location', event.location || null],
    ['Guests', event.guestCount ? String(event.guestCount) : null],
    ['Budget', event.budgetMinor ? formatMoney(event.budgetMinor, event.currency) : null],
    ['Venue', event.venuePreference],
    ['Theme', event.themePreferences.join(', ') || null],
    ['Dietary', event.dietaryRequirements.join(', ') || null],
  ]
  const missing = missingFields(event)
  return (
    <Card className="gap-4 p-5">
      <div>
        <h2 className="font-semibold">What the assistant knows</h2>
        <p className="text-xs text-muted-foreground">It won’t ask again for anything listed here.</p>
      </div>
      <dl className="flex flex-col gap-2 text-sm">
        {known
          .filter(([, v]) => v)
          .map(([k, v]) => (
            <div key={k} className="flex items-start gap-2">
              <CircleCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
              <dt className="text-muted-foreground">{k}:</dt>
              <dd className="capitalize">{v}</dd>
            </div>
          ))}
      </dl>
      <div>
        <h3 className="text-sm font-semibold">Still needed</h3>
        {missing.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing critical — ready to generate a plan.</p>
        ) : (
          <ul className="mt-1 flex flex-col gap-1 text-sm">
            {missing.map((f) => (
              <li key={f} className="flex items-center gap-2 text-accent-foreground">
                <CircleHelp className="size-4" aria-hidden="true" /> {f}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  )
}

export default function PlannerPage() {
  const { eventId } = useParams()
  const { events, messages } = useDemoStore()
  const event = events.find((e) => e.id === eventId)
  const thread = messages.filter((m) => m.eventId === eventId)
  const [draft, setDraft] = useState('')
  const inputId = useId()
  const reasonId = useId()

  return (
    <>
      {!event && <PageHeader title="AI assistant" description="Describe your celebration in your own words. The assistant asks only for what’s missing." />}
      <div className={event ? 'grid gap-6 lg:grid-cols-[1fr_18rem]' : 'mx-auto max-w-3xl'}>
        <Card className="gap-0 overflow-hidden p-0">
          <div role="log" aria-label="Conversation" aria-live="polite" className="flex max-h-[32rem] min-h-64 flex-col gap-4 overflow-y-auto p-5">
            {thread.length === 0 ? (
              <div className="m-auto max-w-md text-center">
                <Bot className="mx-auto size-8 text-primary" aria-hidden="true" />
                <p className="mt-3 font-medium">Tell me about your celebration</p>
                <p className="mt-1 text-sm text-muted-foreground">Try one of these:</p>
                <ul className="mt-4 flex flex-col gap-2">
                  {EXAMPLES.map((ex) => (
                    <li key={ex}>
                      <button
                        type="button"
                        onClick={() => setDraft(ex)}
                        className="w-full rounded-xl border bg-background px-4 py-2.5 text-left text-sm hover:border-primary focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                      >
                        {ex}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              thread.map((msg) => {
                const mine = msg.role === 'user'
                return (
                  <div key={msg.id} className={`flex gap-3 ${mine ? 'flex-row-reverse' : ''}`}>
                    <span
                      className={`grid size-8 shrink-0 place-items-center rounded-full ${mine ? 'bg-coral-soft text-accent-foreground' : 'bg-secondary text-secondary-foreground'}`}
                      aria-hidden="true"
                    >
                      {mine ? <User className="size-4" /> : <Bot className="size-4" />}
                    </span>
                    <p className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${mine ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                      <span className="sr-only">{mine ? 'You: ' : 'Assistant: '}</span>
                      {msg.content}
                    </p>
                  </div>
                )
              })
            )}
          </div>

          <form className="border-t bg-background/60 p-4" onSubmit={(e) => e.preventDefault()}>
            <Label htmlFor={inputId} className="sr-only">Message the assistant</Label>
            <Textarea
              id={inputId}
              rows={3}
              maxLength={MAX_INPUT}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="e.g. A baby shower for 25 guests in Bengaluru on a ₹20,000 budget…"
              aria-describedby={reasonId}
            />
            <div className="mt-2 flex items-center justify-between gap-3">
              <p id={reasonId} className="text-xs text-muted-foreground">
                {AI_PENDING_REASON} <span className="whitespace-nowrap">({draft.length}/{MAX_INPUT})</span>
              </p>
              <Button type="submit" disabled aria-describedby={reasonId}>
                <Send aria-hidden="true" /> Send
              </Button>
            </div>
          </form>
        </Card>

        {event && <KnownContext event={event} />}
      </div>
    </>
  )
}
