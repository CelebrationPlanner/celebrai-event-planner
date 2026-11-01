import type { LucideIcon } from 'lucide-react'
import { useId } from 'react'
import { Button } from '@/components/ui/button'

/** A visible-but-disabled control that says why it's unavailable, instead of a button that silently does nothing. */
export function UnavailableAction({ icon: Icon, label, reason }: { icon?: LucideIcon; label: string; reason: string }) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1">
      <Button disabled aria-describedby={id}>
        {Icon && <Icon aria-hidden="true" />}
        {label}
      </Button>
      <p id={id} className="max-w-xs text-xs text-muted-foreground">
        {reason}
      </p>
    </div>
  )
}
