import { Eraser, RotateCcw } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Field, selectClass } from '@/components/Field'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useDemoStore } from '@/demo/DemoStore'
import { CURRENCIES, type CurrencyCode } from '@/types'

const TIME_ZONES = Intl.supportedValuesOf('timeZone')

export default function SettingsPage() {
  const { profile, actions } = useDemoStore()
  const [name, setName] = useState(profile.name)
  const [timeZone, setTimeZone] = useState(profile.timeZone)
  const [currency, setCurrency] = useState<CurrencyCode>(profile.defaultCurrency)
  const [error, setError] = useState<string>()

  function save(e: FormEvent) {
    e.preventDefault()
    if (!name.trim() || name.trim().length > 80) return setError('Enter a name between 1 and 80 characters.')
    setError(undefined)
    actions.updateProfile({ name: name.trim(), timeZone, defaultCurrency: currency })
    toast.success('Settings saved')
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Settings" description="Your profile and planning preferences." />

      <Card className="p-6">
        <form onSubmit={save} noValidate className="flex flex-col gap-5">
          <h2 className="text-lg font-semibold">Profile</h2>
          <Field label="Display name" error={error}>
            {(p) => <Input {...p} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />}
          </Field>
          <Field label="Email" hint="Sign-in accounts are connected in an upcoming build phase.">
            {(p) => <Input {...p} value={profile.email} readOnly />}
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Time zone" hint="Used so deadlines are never shown as past by mistake.">
              {(p) => (
                <select {...p} className={selectClass} value={timeZone} onChange={(e) => setTimeZone(e.target.value)}>
                  {TIME_ZONES.map((tz) => (
                    <option key={tz}>{tz}</option>
                  ))}
                </select>
              )}
            </Field>
            <Field label="Default currency">
              {(p) => (
                <select {...p} className={selectClass} value={currency} onChange={(e) => setCurrency(e.target.value as CurrencyCode)}>
                  {CURRENCIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              )}
            </Field>
          </div>
          <Button type="submit" className="self-start">Save settings</Button>
        </form>
      </Card>

      <Card className="mt-6 gap-4 p-6">
        <div>
          <h2 className="text-lg font-semibold">Demo data</h2>
          <p className="text-sm text-muted-foreground">Sample events live only in this browser tab. Nothing is sent to a server.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => {
              actions.reset()
              toast.success('Demo data restored')
            }}
          >
            <RotateCcw aria-hidden="true" /> Reset demo data
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              actions.clear()
              toast.success('Demo data cleared', { description: 'Reset any time to bring the samples back.' })
            }}
          >
            <Eraser aria-hidden="true" /> Clear all demo data
          </Button>
        </div>
      </Card>
    </div>
  )
}
