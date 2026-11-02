import { TriangleAlert } from 'lucide-react'
import { isRouteErrorResponse, Link, useRouteError } from 'react-router'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

export function RouteFallback() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-4 p-6" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-9 w-64" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
      <Skeleton className="h-64" />
    </div>
  )
}

export function RouteError() {
  const error = useRouteError()
  const notFound = isRouteErrorResponse(error) && error.status === 404
  return (
    <div role="alert" className="mx-auto flex max-w-md flex-col items-center px-6 py-24 text-center">
      <TriangleAlert className="mb-4 size-8 text-coral" aria-hidden="true" />
      <h1 className="font-heading text-3xl">{notFound ? 'Page not found' : 'Something went wrong'}</h1>
      <p className="mt-2 text-muted-foreground">
        {notFound
          ? 'That page doesn’t exist or has moved.'
          : 'An unexpected error occurred. Try again, or go back to your dashboard.'}
      </p>
      <div className="mt-6 flex gap-2">
        {!notFound && <Button onClick={() => window.location.reload()}>Try again</Button>}
        <Button variant="outline" asChild>
          <Link to="/dashboard">Go to dashboard</Link>
        </Button>
      </div>
    </div>
  )
}
