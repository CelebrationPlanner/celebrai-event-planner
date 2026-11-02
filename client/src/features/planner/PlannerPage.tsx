import { missingDetails, MAX_MESSAGE_LENGTH } from '@celebrai/shared'
import { useMutation } from '@tanstack/react-query'
import { Bot, CircleCheck, CircleHelp, LoaderCircle, Send, TriangleAlert, User } from 'lucide-react'
import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { useNavigate, useParams } from 'react-router'
import { PageHeader } from '@/components/PageHeader'
import { ErrorState } from '@/components/QueryStates'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { api, errorMessage } from '@/lib/api'
import { formatDate } from '@/lib/dates'
import { formatMoney } from '@/lib/money'
import { useConversation, useEventQuery, useRefreshEvent } from '@/lib/queries'
import { occasionLabel, type CelebrationEvent, type ChatMessage } from '@/types'
import { GeneratePlan } from '../events/GeneratePlan'

const EXAMPLES = [
  "My daughter's 5th birthday in Pune for 40 guests, ₹25,000 budget, princess theme, in 12 days.",
  'A 10th anniversary dinner for 20 people in Mumbai next month, budget ₹15,000.',
  'Office Diwali celebration for 60 colleagues, some vegan and Jain.',
]

/** What the backend has stored for this event — the assistant never re-asks for these. */
function KnownContext({ event }: { event: CelebrationEvent }) {
  const known: Array<[string, string | null]> = [
    ['Occasion', occasionLabel(event.occasion)],
    ['Date', event.eventDate ? formatDate(event.eventDate) : null],
    ['Location', event.location || null],
    ['Guests', event.guestCount ? String(event.guestCount) : null],
    ['Budget', event.budgetMinor ? formatMoney(event.budgetMinor, event.currency) : null],
    ['Venue', event.venuePreference],
    ['Theme', event.themePreferences.join(', ') || null],
    ['Dietary', event.dietaryRequirements.join(', ') || null],
  ]
  const missing = missingDetails(event)
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
            {missing.map((m) => (
              <li key={m.field} className="flex items-start gap-2 text-accent-foreground">
                <CircleHelp className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> {m.question}
              </li>
            ))}
          </ul>
        )}
      </div>
      {missing.length === 0 && <GeneratePlan eventId={event.id} />}
    </Card>
  )
}

function Bubble({ message }: { message: Pick<ChatMessage, 'role' | 'content'> }) {
  const mine = message.role === 'user'
  return (
    <div className={`flex gap-3 ${mine ? 'flex-row-reverse' : ''}`}>
      <span
        className={
          `grid size-8 shrink-0 place-items-center rounded-full ` +
          `${mine ? 'bg-coral-soft text-accent-foreground' : 'bg-secondary text-secondary-foreground'}`
        }
        aria-hidden="true"
      >
        {mine ? <User className="size-4" /> : <Bot className="size-4" />}
      </span>
      <p
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${mine ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
      >
        <span className="sr-only">{mine ? 'You: ' : 'Assistant: '}</span>
        {message.content}
      </p>
    </div>
  )
}

export default function PlannerPage() {
  const { eventId } = useParams()
  const navigate = useNavigate()
  const refresh = useRefreshEvent()
  const event = useEventQuery(eventId ?? '')
  const conversation = useConversation(eventId ?? '')
  const [draft, setDraft] = useState('')
  const inputId = useId()
  const hintId = useId()
  const logRef = useRef<HTMLDivElement>(null)

  const chat = useMutation({
    mutationFn: (message: string) => api.chat(message, eventId),
    onSuccess: async (result) => {
      setDraft('')
      await refresh(result.event.id)
      if (!eventId) navigate(`/events/${result.event.id}/planner`)
    },
  })

  const thread = eventId ? (conversation.data ?? []) : []
  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight })
  }, [thread.length, chat.isPending])

  function send(e?: FormEvent) {
    e?.preventDefault()
    const message = draft.trim()
    if (message && !chat.isPending) chat.mutate(message)
  }
  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) send(e)
  }

  return (
    <>
      {!eventId && (
        <PageHeader
          title="AI assistant"
          description="Describe your celebration in your own words. The assistant asks only for what’s missing."
        />
      )}
      <div className={eventId ? 'grid gap-6 lg:grid-cols-[1fr_18rem]' : 'mx-auto max-w-3xl'}>
        <Card className="gap-0 overflow-hidden p-0">
          <div
            ref={logRef}
            role="log"
            aria-label="Conversation"
            aria-live="polite"
            className="flex max-h-[32rem] min-h-64 flex-col gap-4 overflow-y-auto p-5"
          >
            {eventId && conversation.isPending ? (
              <Skeleton className="h-16" />
            ) : conversation.error ? (
              <ErrorState error={conversation.error} onRetry={() => conversation.refetch()} />
            ) : thread.length === 0 && !chat.isPending ? (
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
                        className={
                          'w-full rounded-xl border bg-background px-4 py-2.5 text-left text-sm hover:border-primary ' +
                          'focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none'
                        }
                      >
                        {ex}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <>
                {thread.map((m, i) => (
                  <Bubble key={`${m.at}-${i}`} message={m} />
                ))}
                {chat.isPending && (
                  <>
                    <Bubble message={{ role: 'user', content: chat.variables }} />
                    <p className="flex items-center gap-2 text-sm text-muted-foreground">
                      <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> The assistant is thinking…
                    </p>
                  </>
                )}
              </>
            )}
          </div>

          <form className="border-t bg-background/60 p-4" onSubmit={send}>
            {chat.error && (
              <Alert variant="destructive" role="alert" className="mb-3">
                <TriangleAlert aria-hidden="true" />
                <AlertDescription>{errorMessage(chat.error)} Your message is kept below.</AlertDescription>
              </Alert>
            )}
            <Label htmlFor={inputId} className="sr-only">
              Message the assistant
            </Label>
            <Textarea
              id={inputId}
              rows={3}
              maxLength={MAX_MESSAGE_LENGTH}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="e.g. A baby shower for 25 guests in Bengaluru on a ₹20,000 budget…"
              aria-describedby={hintId}
            />
            <div className="mt-2 flex items-center justify-between gap-3">
              <p id={hintId} className="text-xs text-muted-foreground">
                Enter to send, Shift+Enter for a new line · {draft.length}/{MAX_MESSAGE_LENGTH}
              </p>
              <Button type="submit" disabled={!draft.trim() || chat.isPending}>
                <Send aria-hidden="true" /> Send
              </Button>
            </div>
          </form>
        </Card>

        {eventId && event.data && <KnownContext event={event.data} />}
      </div>
    </>
  )
}
