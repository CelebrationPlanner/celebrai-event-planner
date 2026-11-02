import { PartyPopper } from 'lucide-react'
import { Link } from 'react-router'

export function Logo({ to = '/' }: { to?: string }) {
  return (
    <Link
      to={to}
      className={
        'inline-flex items-center gap-2 rounded-md font-semibold tracking-tight ' +
        'focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none'
      }
    >
      <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground" aria-hidden="true">
        <PartyPopper className="size-4" />
      </span>
      <span className="text-lg">
        Celebr<span className="text-primary">AI</span>
      </span>
    </Link>
  )
}
