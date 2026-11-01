import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { Providers } from '@/app/Providers'
import { routes } from '@/app/routes'
import { createDemoState } from '@/demo/demoData'

/** Renders the full app (real routes, providers and fresh demo data) at `path`. */
export function renderApp(path: string) {
  const user = userEvent.setup()
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(
    <Providers initialState={createDemoState()}>
      <RouterProvider router={router} />
    </Providers>,
  )
  return { user, router }
}
