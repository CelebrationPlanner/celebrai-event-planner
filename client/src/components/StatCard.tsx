import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Card } from '@/components/ui/card'

export function StatCard({ icon: Icon, label, value, hint, tone = 'primary' }: { icon: LucideIcon; label: string; value: ReactNode; hint?: ReactNode; tone?: 'primary' | 'coral' | 'gold' }) {
  const toneClass = { primary: 'bg-secondary text-secondary-foreground', coral: 'bg-coral-soft text-accent-foreground', gold: 'bg-gold-soft text-gold-foreground' }[tone]
  return (
    <Card className="flex-row items-center gap-4 p-4">
      <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${toneClass}`} aria-hidden="true">
        <Icon className="size-5" />
      </span>
      <div className="min-w-0">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="truncate text-xl font-semibold">{value}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
    </Card>
  )
}
