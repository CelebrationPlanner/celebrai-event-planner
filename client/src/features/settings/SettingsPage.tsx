import { useMutation, useQueryClient } from '@tanstack/react-query'
import { LogOut } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { useAuth } from '@/app/session'
import { Field, selectClass } from '@/components/Field'
import { PageHeader } from '@/components/PageHeader'
import { ErrorState, LoadingBlock } from '@/components/QueryStates'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { api, errorMessage, fieldErrors } from '@/lib/api'
import { keys, useProfile } from '@/lib/queries'
import { supabase } from '@/lib/supabase'
import { CURRENCIES, type CurrencyCode, type Profile } from '@/types'

const TIME_ZONES = Intl.supportedValuesOf('timeZone')

function ProfileForm({ profile }: { profile: Profile }) {
  const qc = useQueryClient()
  const [name, setName] = useState(profile.displayName)
  const [timeZone, setTimeZone] = useState(profile.timeZone)
  const [currency, setCurrency] = useState<CurrencyCode>(profile.defaultCurrency)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const save = useMutation({
    mutationFn: () => api.updateProfile({ displayName: name.trim(), timeZone, defaultCurrency: currency }),
    onSuccess: (updated) => {
      qc.setQueryData(keys.profile, updated)
      setErrors({})
      toast.success('Settings saved')
    },
    onError: (err) => {
      setErrors(fieldErrors(err))
      if (!Object.keys(fieldErrors(err)).length) toast.error(errorMessage(err))
    },
  })

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim() || name.trim().length > 80)
      return setErrors({ displayName: 'Enter a name between 1 and 80 characters.' })
    save.mutate()
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      <h2 className="text-lg font-semibold">Profile</h2>
      <Field label="Display name" error={errors.displayName}>
        {(p) => <Input {...p} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />}
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Time zone" hint="Used so deadlines are never shown as past by mistake." error={errors.timeZone}>
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
            <select
              {...p}
              className={selectClass}
              value={currency}
              onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
            >
              {CURRENCIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          )}
        </Field>
      </div>
      <Button type="submit" className="self-start" disabled={save.isPending}>
        {save.isPending ? 'Saving…' : 'Save settings'}
      </Button>
    </form>
  )
}

export default function SettingsPage() {
  const { data, isPending, error, refetch } = useProfile()
  const { session } = useAuth()
  const anonymous = session?.user.is_anonymous

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Settings" description="Your profile and planning preferences." />

      <Card className="p-6">
        {isPending ? (
          <LoadingBlock rows={3} label="Loading profile" />
        ) : error ? (
          <ErrorState error={error} onRetry={() => refetch()} />
        ) : (
          <ProfileForm profile={data} />
        )}
      </Card>

      <Card className="mt-6 gap-4 p-6">
        <div>
          <h2 className="text-lg font-semibold">Account</h2>
          <p className="text-sm text-muted-foreground">
            {anonymous
              ? 'You’re using a temporary demo account. Your data is private to this browser session.'
              : `Signed in as ${session?.user.email}.`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {anonymous && (
            <Button asChild>
              <Link to="/signup">Create an account to keep your plans</Link>
            </Button>
          )}
          <Button variant="outline" onClick={() => supabase.auth.signOut()}>
            <LogOut aria-hidden="true" /> {anonymous ? 'Exit demo' : 'Log out'}
          </Button>
        </div>
      </Card>
    </div>
  )
}
