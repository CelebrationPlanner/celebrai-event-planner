import { Check } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

/** Static example of a generated plan, shown in the landing hero. */
export function PlanPreview() {
  const bars = [
    { label: 'Food & catering', value: '₹8,000', pct: 32 },
    { label: 'Venue', value: '₹5,000', pct: 20 },
    { label: 'Decoration', value: '₹4,000', pct: 16 },
    { label: 'Contingency', value: '₹2,000', pct: 8 },
  ]
  return (
    <figure className="relative rounded-3xl border bg-card p-5 shadow-[0_24px_60px_-28px_rgb(11_93_115/0.30)] sm:p-6">
      <figcaption className="sr-only">Example of a generated plan for a children’s birthday party</figcaption>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Event plan</p>
          <p className="font-heading text-2xl">Anaya’s 5th Birthday</p>
          <p className="text-sm text-muted-foreground">Pune · 40 guests · in 12 days</p>
        </div>
        <Badge className="bg-gold-soft text-gold-foreground">₹25,000</Badge>
      </div>

      <div className="mt-5 rounded-2xl bg-secondary p-4">
        <p className="text-sm font-semibold text-secondary-foreground">Theme: Pastel Princess Garden</p>
        <p className="mt-1 text-sm text-secondary-foreground/80">
          <span className="font-medium">Why:</span> she loves princesses, and balloon décor is the most affordable way
          to transform a hall.
        </p>
      </div>

      <div className="mt-5 space-y-3">
        {bars.map((b) => (
          <div key={b.label}>
            <div className="flex justify-between text-sm">
              <span>{b.label}</span>
              <span className="font-medium">{b.value}</span>
            </div>
            <div className="mt-1 h-2 rounded-full bg-muted">
              <div className="h-2 rounded-full bg-primary" style={{ width: `${b.pct * 2.5}%` }} />
            </div>
          </div>
        ))}
      </div>

      <ul className="mt-5 space-y-2 text-sm">
        <li className="flex items-center gap-2">
          <Check className="size-4 text-primary" aria-hidden="true" />{' '}
          <span className="text-muted-foreground line-through">Book the venue</span>
        </li>
        <li className="flex items-center gap-2">
          <span className="size-4 rounded border" aria-hidden="true" /> Book magician or game host
          <Badge variant="outline" className="ml-auto border-coral text-accent-foreground">
            Urgent
          </Badge>
        </li>
        <li className="flex items-center gap-2">
          <span className="size-4 rounded border" aria-hidden="true" /> Send invitations
        </li>
      </ul>
    </figure>
  )
}
