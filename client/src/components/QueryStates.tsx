import { RotateCw, TriangleAlert } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { errorMessage } from '@/lib/api'

export function LoadingBlock({ rows = 3, label = 'Loading' }: { rows?: number; label?: string }) {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-label={label}>
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-16" />
      ))}
    </div>
  )
}

export function ErrorState({ error, onRetry, title = 'Couldn’t load this' }: { error: unknown; onRetry?: () => void; title?: string }) {
  return (
    <Alert variant="destructive" role="alert">
      <TriangleAlert aria-hidden="true" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        <p>{errorMessage(error)}</p>
        {onRetry && (
          <Button variant="outline" size="sm" className="mt-2" onClick={onRetry}>
            <RotateCw aria-hidden="true" /> Try again
          </Button>
        )}
      </AlertDescription>
    </Alert>
  )
}
