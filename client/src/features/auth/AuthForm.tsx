import { Info, LoaderCircle } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router'
import { z } from 'zod'
import { startDemo, syncTimeZone, useAuth } from '@/app/auth'
import { Field } from '@/components/Field'
import { Logo } from '@/components/Logo'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { api, errorMessage } from '@/lib/api'
import { supabase } from '@/lib/supabase'

const loginSchema = z.object({
  email: z.email('Enter a valid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
})
const signupSchema = loginSchema.extend({ name: z.string().trim().min(1, 'Enter your name.').max(80, 'Keep your name under 80 characters.') })

type Errors = Partial<Record<'name' | 'email' | 'password' | 'form', string>>

/** Only same-app paths are allowed as a post-login destination (no open redirects). */
const safeNext = (next: string | null) => (next && next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard')

export function AuthForm({ mode }: { mode: 'login' | 'signup' }) {
  const [errors, setErrors] = useState<Errors>({})
  const [pending, setPending] = useState(false)
  const [confirmEmail, setConfirmEmail] = useState(false)
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { session } = useAuth()
  const isSignup = mode === 'signup'
  const next = safeNext(params.get('next'))
  const upgradingDemo = isSignup && session?.user.is_anonymous

  // Already signed in with a real account: nothing to do here.
  if (session && !session.user.is_anonymous) return <Navigate to={next} replace />

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const result = (isSignup ? signupSchema : loginSchema).safeParse(Object.fromEntries(new FormData(e.currentTarget)))
    if (!result.success) {
      const fieldErrors: Errors = {}
      for (const issue of result.error.issues) fieldErrors[issue.path[0] as keyof Errors] ??= issue.message
      return setErrors(fieldErrors)
    }
    setErrors({})
    setPending(true)
    try {
      const { email, password } = result.data
      if (!isSignup) {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        // One generic message: never reveal whether an email is registered.
        if (error) return setErrors({ form: 'Email or password is incorrect.' })
        return navigate(next, { replace: true })
      }

      const name = (result.data as z.infer<typeof signupSchema>).name
      // A demo user becomes a permanent account in place, keeping their events.
      const { data, error } = upgradingDemo
        ? await supabase.auth.updateUser({ email, password, data: { display_name: name } })
        : await supabase.auth.signUp({ email, password, options: { data: { display_name: name } } })
      if (error) return setErrors({ form: error.message.includes('already') ? 'An account with this email already exists. Try logging in.' : 'Couldn’t create your account. Please try again.' })
      if (!upgradingDemo && !('session' in data && data.session)) return setConfirmEmail(true)
      await Promise.all([syncTimeZone(), api.updateProfile({ displayName: name }).catch(() => undefined)])
      navigate(next, { replace: true })
    } finally {
      setPending(false)
    }
  }

  async function tryDemo() {
    setPending(true)
    try {
      await startDemo()
      navigate('/dashboard')
    } catch (err) {
      setErrors({ form: errorMessage(err) })
    } finally {
      setPending(false)
    }
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-12">
      <Logo />
      <Card className="mt-8 w-full max-w-sm p-6">
        <h1 className="font-heading text-3xl">{isSignup ? (upgradingDemo ? 'Keep your plans' : 'Create your account') : 'Welcome back'}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {upgradingDemo ? 'Turn your demo into a permanent account — your events come with you.' : isSignup ? 'Save events and pick up planning anywhere.' : 'Log in to continue planning.'}
        </p>

        {confirmEmail ? (
          <Alert className="mt-6" role="status">
            <Info aria-hidden="true" />
            <AlertTitle>Check your inbox</AlertTitle>
            <AlertDescription>We’ve sent a confirmation link. Confirm your email, then log in.</AlertDescription>
          </Alert>
        ) : (
          <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
            {isSignup && (
              <Field label="Name" error={errors.name}>
                {(p) => <Input {...p} name="name" autoComplete="name" />}
              </Field>
            )}
            <Field label="Email" error={errors.email}>
              {(p) => <Input {...p} name="email" type="email" autoComplete="email" />}
            </Field>
            <Field label="Password" error={errors.password} hint={isSignup ? 'At least 8 characters.' : undefined}>
              {(p) => <Input {...p} name="password" type="password" autoComplete={isSignup ? 'new-password' : 'current-password'} />}
            </Field>
            {errors.form && (
              <p role="alert" className="text-sm text-destructive">
                {errors.form}
              </p>
            )}
            <Button type="submit" size="lg" className="mt-2 h-10" disabled={pending}>
              {pending && <LoaderCircle className="animate-spin" aria-hidden="true" />}
              {isSignup ? (upgradingDemo ? 'Save my account' : 'Create account') : 'Log in'}
            </Button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {isSignup ? 'Already have an account? ' : 'New to CelebrAI? '}
          <Link to={`${isSignup ? '/login' : '/signup'}?next=${encodeURIComponent(next)}`} className="font-medium text-primary underline-offset-2 hover:underline">
            {isSignup ? 'Log in' : 'Create an account'}
          </Link>
        </p>
      </Card>
      {!upgradingDemo && (
        <button type="button" onClick={tryDemo} disabled={pending} className="mt-4 text-sm text-muted-foreground underline-offset-2 hover:underline disabled:opacity-50">
          Or try the demo without an account
        </button>
      )}
    </main>
  )
}
