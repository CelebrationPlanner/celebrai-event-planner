import { ArrowRight } from 'lucide-react'
import { useEffect } from 'react'
import { Link } from 'react-router'
import { Logo } from '@/components/Logo'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useDemo } from '@/features/landing/useDemo'
import { formatMoney } from '@/lib/money'
import { categoryLabel, type Priority } from '@/types'
import { HOME_TITLE, OCCASION_PAGES, type OccasionPageContent } from './pages'

const priorityClass: Record<Priority, string> = {
  high: 'border-coral text-accent-foreground',
  medium: 'border-gold text-gold-foreground',
  low: 'text-muted-foreground',
}

const inr = (minor: number) => formatMoney(minor, 'INR')

/** A public planning guide for one occasion, built around a worked example from the engine. */
export default function OccasionPage({ page }: { page: OccasionPageContent }) {
  const demo = useDemo()
  const { input, budget, decisions, tasks, risks } = page.example
  const tasksByDate = [...tasks].sort((a, b) => b.daysBefore - a.daysBefore)
  const others = OCCASION_PAGES.filter((p) => p.slug !== page.slug)

  // The pre-rendered HTML has the right <title>; this keeps it right after in-app navigation,
  // which also arrives here from mid-way down another page.
  useEffect(() => {
    document.title = page.title
    window.scrollTo(0, 0)
    return () => {
      document.title = HOME_TITLE
    }
  }, [page.title])

  return (
    <div className="min-h-dvh">
      <header className="border-b">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3 sm:px-6">
          <Logo />
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

      <main className="mx-auto max-w-4xl px-4 sm:px-6">
        <section className="pt-12 pb-10">
          <p className="text-sm font-medium text-primary">Planning guide</p>
          <h1 className="mt-2 font-heading text-4xl leading-tight sm:text-5xl">{page.h1}</h1>
          <p className="mt-5 max-w-3xl text-lg text-muted-foreground">{page.intro}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" className="h-11 px-5 text-base" asChild>
              <Link to={`/events/new?occasion=${input.occasion}`}>
                {page.cta} <ArrowRight aria-hidden="true" />
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
        </section>

        <section className="border-t py-10" aria-labelledby="example">
          <h2 id="example" className="font-heading text-3xl">
            {page.exampleHeading}
          </h2>
          <p className="mt-3 text-muted-foreground">
            {input.eventName}: {input.guestCount} guests, {inr(input.budgetMinor)}, {input.venuePreference} venue in{' '}
            {input.location}
            {input.dietaryRequirements.length > 0 && `, ${input.dietaryRequirements.join(' and ')} catering`}, planned{' '}
            {input.daysUntil} days ahead.
          </p>

          {decisions.length > 0 && (
            <div className="mt-6 rounded-2xl bg-secondary p-5 text-secondary-foreground">
              <h3 className="font-semibold">Rules that shaped this plan</h3>
              <ul className="mt-2 space-y-2">
                {decisions.map((d) => (
                  <li key={d.rule}>
                    <strong>{d.rule}:</strong> {d.detail}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-6 overflow-x-auto rounded-2xl border">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Budget split for {input.eventName}</caption>
              <thead className="bg-card">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Category
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">
                    Amount
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">
                    Share
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Why
                  </th>
                </tr>
              </thead>
              <tbody>
                {budget.map((line) => (
                  <tr key={line.category} className="border-t">
                    <th scope="row" className="px-4 py-3 font-medium">
                      {categoryLabel(line.category)}
                    </th>
                    <td className="px-4 py-3 text-right tabular-nums">{inr(line.amountMinor)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {Math.round((line.amountMinor / input.budgetMinor) * 1000) / 10}%
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{line.reasoning}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t bg-card">
                  <th scope="row" className="px-4 py-3 font-semibold">
                    Total
                  </th>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">
                    {inr(budget.reduce((sum, l) => sum + l.amountMinor, 0))}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">100%</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Costs are estimates from typical prices, not vendor quotations. Venue and vendor availability is not
            checked: confirm directly before booking.
          </p>
        </section>

        <section className="border-t py-10" aria-labelledby="checklist">
          <h2 id="checklist" className="font-heading text-3xl">
            Checklist: what to do, and when
          </h2>
          <ol className="mt-6 divide-y rounded-2xl border">
            {tasksByDate.map((t) => (
              <li key={t.title} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3">
                <span className="w-full shrink-0 text-sm text-muted-foreground tabular-nums sm:w-32">
                  {t.daysBefore} {t.daysBefore === 1 ? 'day' : 'days'} before
                </span>
                <span className="flex-1">{t.title}</span>
                <Badge variant="outline" className={`capitalize ${priorityClass[t.priority]}`}>
                  {t.priority}
                </Badge>
              </li>
            ))}
          </ol>
        </section>

        <section className="border-t py-10" aria-labelledby="risks">
          <h2 id="risks" className="font-heading text-3xl">
            What could go wrong
          </h2>
          <ul className="mt-6 space-y-4">
            {risks.map((r) => (
              <li key={r.issue}>
                <p className="font-medium">{r.issue}</p>
                <p className="text-muted-foreground">{r.mitigation}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="border-t py-10" aria-labelledby="tips">
          <h2 id="tips" className="font-heading text-3xl">
            Tips
          </h2>
          <ul className="mt-6 list-disc space-y-2 pl-5">
            {page.tips.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </section>

        <section className="border-t py-10" aria-labelledby="faq">
          <h2 id="faq" className="font-heading text-3xl">
            Questions
          </h2>
          <div className="mt-6 space-y-6">
            {page.faqs.map((f) => (
              <div key={f.q}>
                <h3 className="font-semibold">{f.q}</h3>
                <p className="mt-1 text-muted-foreground">{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="py-10">
          <div className="flex flex-col items-start gap-6 rounded-3xl bg-primary p-8 text-primary-foreground sm:p-10">
            <div>
              <h2 className="font-heading text-3xl">Get a plan like this for your event</h2>
              <p className="mt-2 text-primary-foreground/85">
                Describe it in one sentence. CelebrAI works out the budget, checklist, timeline and invitation.
              </p>
            </div>
            <Button size="lg" variant="secondary" className="h-11 px-5 text-base" asChild>
              <Link to={`/events/new?occasion=${input.occasion}`}>{page.cta}</Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-4xl flex-col gap-4 px-4 py-8 text-sm text-muted-foreground sm:px-6">
          <nav aria-label="More planning guides">
            <ul className="flex flex-wrap gap-x-6 gap-y-2">
              <li>
                <Link to="/" className="hover:text-foreground">
                  CelebrAI home
                </Link>
              </li>
              {others.map((p) => (
                <li key={p.slug}>
                  <Link to={`/${p.slug}`} className="hover:text-foreground">
                    {p.h1}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <p>Costs are estimates, not vendor quotations. Always confirm venue availability directly.</p>
        </div>
      </footer>
    </div>
  )
}
