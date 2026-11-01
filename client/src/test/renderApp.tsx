import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { Providers } from '@/app/Providers'
import { routes } from '@/app/routes'
import { createQueryClient } from '@/lib/queries'
import { makeSession, resetFakes } from './fakeBackend'

/** Renders the full app (real routes and providers) at `path`, backed by the fake API. */
export function renderApp(path: string, options: { signedIn?: boolean } = {}) {
  resetFakes(options.signedIn === false ? null : makeSession())
  const user = userEvent.setup()
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  const queryClient = createQueryClient()
  queryClient.setDefaultOptions({ queries: { ...queryClient.getDefaultOptions().queries, retry: false } })
  render(
    <Providers queryClient={queryClient}>
      <RouterProvider router={router} />
    </Providers>,
  )
  return { user, router }
}
