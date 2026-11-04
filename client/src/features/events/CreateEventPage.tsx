import { useMutation } from '@tanstack/react-query'
import { ArrowLeft, ArrowRight, Check, LoaderCircle } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { api, errorMessage, fieldErrors } from '@/lib/api'
import { todayISO } from '@/lib/dates'
import { parseMoney } from '@/lib/money'
import { useRefreshEvent } from '@/lib/queries'
import { OCCASIONS, type CelebrationEvent, type CurrencyCode, type Occasion } from '@/types'
import { emptyEventForm, validateStep, type EventFormValues, type FormErrors } from './eventForm'
import { BasicsStep, GuestsStep, PreferencesStep, ReviewStep, type SetField } from './EventFormSteps'

const STEPS = ['The basics', 'Guests & budget', 'Preferences', 'Review']
// Which step shows each field, so a server-side validation error can take the user back to it.
const FIELD_STEP: Record<string, number> = {
  occasion: 0,
  eventName: 0,
  eventDate: 0,
  location: 0,
  guestCount: 1,
  budget: 1,
  currency: 1,
  venuePreference: 1,
}

export default function CreateEventPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const refresh = useRefreshEvent()
  const create = useMutation({ mutationFn: api.createEvent })
  const today = todayISO()
  const initialOccasion = OCCASIONS.some((o) => o.value === params.get('occasion')) ? params.get('occasion')! : ''

  const [step, setStep] = useState(0)
  const [values, setValues] = useState<EventFormValues>(() => emptyEventForm(initialOccasion))
  const [errors, setErrors] = useState<FormErrors>({})

  const set: SetField = (key, value) => setValues((v) => ({ ...v, [key]: value }))

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (step < STEPS.length - 1) {
      const stepErrors = validateStep(step, values, today)
      setErrors(stepErrors)
      if (Object.keys(stepErrors).length === 0) setStep(step + 1)
      return
    }
    create.mutate(
      {
        occasion: values.occasion as Occasion,
        eventName: values.eventName.trim(),
        eventDate: values.eventDate || null,
        location: values.location.trim(),
        guestCount: Number(values.guestCount),
        budgetMinor: parseMoney(values.budget)!,
        currency: values.currency as CurrencyCode,
        venuePreference: values.venuePreference as CelebrationEvent['venuePreference'],
        themePreferences: values.themePreferences
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        ageGroup: values.ageGroup,
        dietaryRequirements: values.dietaryRequirements,
        additionalInstructions: values.additionalInstructions.trim(),
      },
      {
        onSuccess: (event) => {
          refresh(event.id)
          toast.success('Event created', { description: 'Next, let the assistant build your plan.' })
          navigate(`/events/${event.id}`)
        },
        onError: (err) => {
          const server = fieldErrors(err)
          const mapped: FormErrors = Object.fromEntries(
            Object.entries(server).map(([k, v]) => [k === 'budgetMinor' ? 'budget' : k, v]),
          )
          const first = Object.keys(mapped)
            .map((k) => FIELD_STEP[k])
            .filter((n) => n !== undefined)
          if (first.length) {
            setErrors(mapped)
            setStep(Math.min(...first))
          } else toast.error(errorMessage(err))
        },
      },
    )
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Create an event" description="Only the essentials — you can refine everything later." />

      <ol className="mb-6 grid grid-cols-4 gap-2" aria-label="Progress">
        {STEPS.map((label, i) => (
          <li key={label} aria-current={i === step ? 'step' : undefined} className="flex flex-col gap-2">
            <span className={`h-1.5 rounded-full ${i <= step ? 'bg-primary' : 'bg-muted'}`} aria-hidden="true" />
            <span className={`text-xs ${i === step ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
              <span className="sr-only">Step {i + 1}: </span>
              {label}
            </span>
          </li>
        ))}
      </ol>

      <Card className="p-6">
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
          <h2 className="text-lg font-semibold">{STEPS[step]}</h2>

          {step === 0 && <BasicsStep values={values} errors={errors} set={set} today={today} />}
          {step === 1 && <GuestsStep values={values} errors={errors} set={set} />}
          {step === 2 && <PreferencesStep values={values} errors={errors} set={set} />}
          {step === 3 && <ReviewStep values={values} />}

          <div className="flex justify-between gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setStep(step - 1)} disabled={step === 0}>
              <ArrowLeft aria-hidden="true" /> Back
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {step === STEPS.length - 1 ? (
                <>
                  {create.isPending ? (
                    <LoaderCircle className="animate-spin" aria-hidden="true" />
                  ) : (
                    <Check aria-hidden="true" />
                  )}{' '}
                  Create event
                </>
              ) : (
                <>
                  Next <ArrowRight aria-hidden="true" />
                </>
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
