import { Info } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { z } from 'zod'
import { Field } from '@/components/Field'
import { Logo } from '@/components/Logo'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

const loginSchema = z.object({
  email: z.email('Enter a valid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
})
const signupSchema = loginSchema.extend({ name: z.string().trim().min(1, 'Enter your name.').max(80) })

type Errors = Partial<Record<'name' | 'email' | 'password', string>>

export function AuthForm({ mode }: { mode: 'login' | 'signup' }) {
  const [errors, setErrors] = useState<Errors>({})
  const [submitted, setSubmitted] = useState(false)
  const isSignup = mode === 'signup'

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const values = Object.fromEntries(new FormData(e.currentTarget))
    const result = (isSignup ? signupSchema : loginSchema).safeParse(values)
    if (!result.success) {
      const next: Errors = {}
      for (const issue of result.error.issues) next[issue.path[0] as keyof Errors] ??= issue.message
      setErrors(next)
      setSubmitted(false)
      return
    }
    // ponytail: Supabase Auth is wired in Phase 5; until then nothing is sent anywhere.
    setErrors({})
    setSubmitted(true)
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-12">
      <Logo />
      <Card className="mt-8 w-full max-w-sm p-6">
        <h1 className="font-heading text-3xl">{isSignup ? 'Create your account' : 'Welcome back'}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{isSignup ? 'Save events and pick up planning anywhere.' : 'Log in to continue planning.'}</p>

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
          <Button type="submit" size="lg" className="mt-2 h-10">
            {isSignup ? 'Create account' : 'Log in'}
          </Button>
        </form>

        {submitted && (
          <Alert className="mt-4" role="status">
            <Info aria-hidden="true" />
            <AlertTitle>Accounts aren’t connected yet</AlertTitle>
            <AlertDescription>
              <p>Your details are valid but were not sent anywhere. Sign-in goes live when the backend is connected.</p>
              <Link to="/dashboard" className="font-medium text-primary underline underline-offset-2">
                Explore the demo instead
              </Link>
            </AlertDescription>
          </Alert>
        )}

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {isSignup ? 'Already have an account? ' : 'New to CelebrAI? '}
          <Link to={isSignup ? '/login' : '/signup'} className="font-medium text-primary underline-offset-2 hover:underline">
            {isSignup ? 'Log in' : 'Create an account'}
          </Link>
        </p>
      </Card>
      <Link to="/dashboard" className="mt-4 text-sm text-muted-foreground underline-offset-2 hover:underline">
        Or try the demo without an account
      </Link>
    </main>
  )
}
