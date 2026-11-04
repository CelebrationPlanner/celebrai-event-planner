// The four steps of the create-event wizard. The page owns the form state and submission;
// each step only renders its fields.
import { Field, selectClass } from '@/components/Field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { formatDate } from '@/lib/dates'
import { formatMoney, parseMoney } from '@/lib/money'
import { CURRENCIES, OCCASIONS, type CurrencyCode } from '@/types'
import { AGE_GROUPS, DIETARY_OPTIONS, type EventFormValues, type FormErrors } from './eventForm'

export type SetField = <K extends keyof EventFormValues>(key: K, value: EventFormValues[K]) => void

interface StepProps {
  values: EventFormValues
  errors: FormErrors
  set: SetField
}

export function BasicsStep({ values, errors, set, today }: StepProps & { today: string }) {
  return (
    <>
      <Field label="Occasion" error={errors.occasion}>
        {(p) => (
          <select
            {...p}
            className={selectClass}
            value={values.occasion}
            onChange={(e) => set('occasion', e.target.value)}
          >
            <option value="">Choose an occasion…</option>
            {OCCASIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        )}
      </Field>
      <Field label="Event name" error={errors.eventName}>
        {(p) => (
          <Input
            {...p}
            value={values.eventName}
            onChange={(e) => set('eventName', e.target.value)}
            placeholder="e.g. Anaya’s 5th Birthday"
          />
        )}
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Date" error={errors.eventDate} hint="Not sure yet? Leave it blank.">
          {(p) => (
            <Input
              {...p}
              type="date"
              min={today}
              value={values.eventDate}
              onChange={(e) => set('eventDate', e.target.value)}
            />
          )}
        </Field>
        <Field label="Location" error={errors.location}>
          {(p) => (
            <Input
              {...p}
              value={values.location}
              onChange={(e) => set('location', e.target.value)}
              placeholder="City or area"
            />
          )}
        </Field>
      </div>
    </>
  )
}

export function GuestsStep({ values, errors, set }: StepProps) {
  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Guest count" error={errors.guestCount}>
          {(p) => (
            <Input
              {...p}
              inputMode="numeric"
              value={values.guestCount}
              onChange={(e) => set('guestCount', e.target.value)}
            />
          )}
        </Field>
        <div className="grid grid-cols-[1fr_6rem] gap-2">
          <Field label="Total budget" error={errors.budget}>
            {(p) => (
              <Input
                {...p}
                inputMode="decimal"
                value={values.budget}
                onChange={(e) => set('budget', e.target.value)}
                placeholder="25000"
              />
            )}
          </Field>
          <Field label="Currency">
            {(p) => (
              <select
                {...p}
                className={selectClass}
                value={values.currency}
                onChange={(e) => set('currency', e.target.value)}
              >
                {CURRENCIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            )}
          </Field>
        </div>
      </div>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-sm font-medium">Venue preference</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {(['indoor', 'outdoor', 'flexible'] as const).map((v) => (
            <label
              key={v}
              className={
                'flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm capitalize has-checked:border-primary ' +
                'has-checked:bg-secondary has-focus-visible:ring-3 has-focus-visible:ring-ring/50'
              }
            >
              <input
                type="radio"
                name="venuePreference"
                value={v}
                checked={values.venuePreference === v}
                onChange={() => set('venuePreference', v)}
                className="accent-primary"
              />
              {v}
            </label>
          ))}
        </div>
      </fieldset>
    </>
  )
}

export function PreferencesStep({ values, errors, set }: StepProps) {
  const toggleDiet = (option: string) =>
    set(
      'dietaryRequirements',
      values.dietaryRequirements.includes(option)
        ? values.dietaryRequirements.filter((d) => d !== option)
        : [...values.dietaryRequirements, option],
    )
  return (
    <>
      <Field
        label="Theme preferences"
        error={errors.themePreferences}
        hint="Separate ideas with commas, e.g. Princess, pastel colours."
      >
        {(p) => (
          <Input {...p} value={values.themePreferences} onChange={(e) => set('themePreferences', e.target.value)} />
        )}
      </Field>
      <Field label="Age group">
        {(p) => (
          <select
            {...p}
            className={selectClass}
            value={values.ageGroup}
            onChange={(e) => set('ageGroup', e.target.value)}
          >
            <option value="">Not specified</option>
            {AGE_GROUPS.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
        )}
      </Field>
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Dietary requirements</legend>
        <div className="flex flex-wrap gap-2">
          {DIETARY_OPTIONS.map((d) => (
            <label
              key={d}
              className={
                'flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm has-checked:border-primary ' +
                'has-checked:bg-secondary has-focus-visible:ring-3 has-focus-visible:ring-ring/50'
              }
            >
              <input
                type="checkbox"
                checked={values.dietaryRequirements.includes(d)}
                onChange={() => toggleDiet(d)}
                className="accent-primary"
              />
              {d}
            </label>
          ))}
        </div>
      </fieldset>
      <Field
        label="Anything else?"
        error={errors.additionalInstructions}
        hint="Optional. Special requests, accessibility needs, must-haves."
      >
        {(p) => (
          <Textarea
            {...p}
            rows={3}
            value={values.additionalInstructions}
            onChange={(e) => set('additionalInstructions', e.target.value)}
          />
        )}
      </Field>
    </>
  )
}

export function ReviewStep({ values }: { values: EventFormValues }) {
  const occasionLabel = OCCASIONS.find((o) => o.value === values.occasion)?.label
  const budgetMinor = parseMoney(values.budget)
  const review: Array<[string, string]> = [
    ['Occasion', occasionLabel ?? '—'],
    ['Event name', values.eventName],
    ['Date', values.eventDate ? formatDate(values.eventDate) : 'Not decided — the assistant will ask'],
    ['Location', values.location || 'Not specified'],
    ['Guests', values.guestCount],
    ['Budget', budgetMinor !== null ? formatMoney(budgetMinor, values.currency as CurrencyCode) : '—'],
    ['Venue preference', values.venuePreference],
    ['Theme preferences', values.themePreferences || 'None'],
    ['Age group', values.ageGroup || 'Not specified'],
    ['Dietary requirements', values.dietaryRequirements.join(', ') || 'None'],
    ['Additional instructions', values.additionalInstructions || 'None'],
  ]
  return (
    <dl className="divide-y rounded-lg border">
      {review.map(([k, v]) => (
        <div key={k} className="grid gap-1 px-4 py-2.5 text-sm sm:grid-cols-[11rem_1fr]">
          <dt className="text-muted-foreground">{k}</dt>
          <dd className="break-words">{v}</dd>
        </div>
      ))}
    </dl>
  )
}
