import { ArrowRight, Check } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { startDemo } from '@/app/session'
import { Logo } from '@/components/Logo'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { errorMessage } from '@/lib/api'
import { DECISIONS, EXAMPLES, FEATURES, STEPS } from './content'
import { PlanPreview } from './PlanPreview'

/** Starts an isolated demo account with a sample event, then opens the dashboard. */
function useDemo() {
  const navigate = useNavigate()
  const [pending, setPending] = useState(false)
  async function run() {
    setPending(true)
    try {
      await startDemo()
      navigate('/dashboard')
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setPending(false)
    }
  }
  return { run, pending }
}

export default function LandingPage() {
  const demo = useDemo()
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-40 border-b border-transparent bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Logo />
          <nav aria-label="Primary" className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <a href="#examples" className="hover:text-foreground">
              Occasions
            </a>
            <a href="#how" className="hover:text-foreground">
              How it works
            </a>
            <a href="#features" className="hover:text-foreground">
              Features
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild>
              <Link to="/login">Log in</Link>
            </Button>
            <Button asChild>
              <Link to="/events/new">Start planning</Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-12 pb-20 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:pt-20">
          <div>
            <Badge variant="outline" className="mb-5 gap-1.5 border-primary/30 bg-card text-secondary-foreground">
              <span className="size-1.5 rounded-full bg-coral" aria-hidden="true" />
              Plans that explain themselves
            </Badge>
            <h1 className="font-heading text-5xl leading-[1.05] sm:text-6xl">Every Celebration Starts With a Plan.</h1>
            <p className="mt-5 max-w-xl text-lg text-muted-foreground">
              Your intelligent celebration assistant. Plan smarter, manage budgets, and make every moment memorable.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" className="h-11 px-5 text-base" asChild>
                <Link to="/events/new">
                  Start planning <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-11 px-5 text-base"
                onClick={demo.run}
                disabled={demo.pending}
              >
                {demo.pending ? 'Preparing your demo…' : 'Explore the demo'}
              </Button>
            </div>
            <ul className="mt-8 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
              {[
                'Budget totals verified by the backend',
                'Asks before it assumes',
                'Estimates clearly labelled',
                'Never claims a venue is available',
              ].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <Check className="size-4 text-primary" aria-hidden="true" /> {t}
                </li>
              ))}
            </ul>
          </div>
          <PlanPreview />
        </section>

        <section id="examples" className="border-y bg-card py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="font-heading text-4xl">Plan any occasion</h2>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Pick an occasion to start a plan with it pre-selected.
            </p>
            <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {EXAMPLES.map(({ occasion, icon: Icon, title, example }) => (
                <li key={occasion}>
                  <Link
                    to={`/events/new?occasion=${occasion}`}
                    className={
                      'group flex h-full flex-col rounded-2xl border bg-background p-5 transition-shadow ' +
                      'hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none'
                    }
                  >
                    <Icon className="size-5 text-coral" aria-hidden="true" />
                    <span className="mt-3 font-semibold">{title}</span>
                    <span className="mt-1 text-sm text-muted-foreground">{example}</span>
                    <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
                      Plan this{' '}
                      <ArrowRight
                        className="size-3.5 transition-transform group-hover:translate-x-0.5"
                        aria-hidden="true"
                      />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="how" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <h2 className="font-heading text-4xl">How it works</h2>
          <ol className="mt-10 grid gap-6 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className="rounded-2xl border bg-card p-6">
                <span className="grid size-9 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                  {i + 1}
                </span>
                <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
                <p className="mt-1 text-muted-foreground">{s.body}</p>
              </li>
            ))}
          </ol>

          <div className="mt-12 rounded-3xl bg-secondary p-6 sm:p-8">
            <h3 className="font-heading text-2xl text-secondary-foreground">How CelebrAI decides</h3>
            <ul className="mt-6 grid gap-4 sm:grid-cols-2">
              {DECISIONS.map(({ icon: Icon, when, then }) => (
                <li key={when} className="flex gap-3">
                  <span
                    className="grid size-9 shrink-0 place-items-center rounded-xl bg-card text-primary"
                    aria-hidden="true"
                  >
                    <Icon className="size-4" />
                  </span>
                  <p className="text-secondary-foreground">
                    <strong>{when}</strong> → {then}.
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="features" className="border-t bg-card py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="font-heading text-4xl">Everything in one plan</h2>
            <ul className="mt-10 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map(({ icon: Icon, title, body }) => (
                <li key={title}>
                  <Icon className="size-5 text-primary" aria-hidden="true" />
                  <h3 className="mt-3 font-semibold">{title}</h3>
                  <p className="mt-1 text-muted-foreground">{body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div
            className={
              'flex flex-col items-start gap-6 rounded-3xl bg-primary p-8 ' +
              'text-primary-foreground sm:p-12 md:flex-row md:items-center md:justify-between'
            }
          >
            <div>
              <h2 className="font-heading text-3xl sm:text-4xl">Ready to plan your next celebration?</h2>
              <p className="mt-2 text-primary-foreground/85">Start with a sentence. CelebrAI does the organising.</p>
            </div>
            <Button size="lg" variant="secondary" className="h-11 px-5 text-base" asChild>
              <Link to="/events/new">Start planning</Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-muted-foreground sm:px-6 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-2">
            <Logo />
            <p>Hack2Skills Challenge 5 · Celebration &amp; Event Planner vertical.</p>
            <p>Costs are estimates, not vendor quotations. Always confirm venue availability directly.</p>
          </div>
          <nav aria-label="Footer" className="flex gap-4">
            <Link to="/login" className="hover:text-foreground">
              Log in
            </Link>
            <Link to="/signup" className="hover:text-foreground">
              Sign up
            </Link>
            <button type="button" onClick={demo.run} disabled={demo.pending} className="hover:text-foreground">
              Demo
            </button>
          </nav>
        </div>
      </footer>
    </div>
  )
}
