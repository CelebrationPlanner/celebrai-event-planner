import type { ComponentType } from 'react'
import type { RouteObject } from 'react-router'
import { RouteError, RouteFallback } from '@/components/RouteStates'
import LandingPage from '@/features/landing/LandingPage'
import OccasionPage from '@/features/occasions/OccasionPage'
import { OCCASION_PAGES } from '@/features/occasions/pages'

// Every screen except the pre-rendered public pages is code-split and loaded on first visit.
const page = (load: () => Promise<{ default: ComponentType }>) => async () => ({ Component: (await load()).default })

export const routes: RouteObject[] = [
  {
    errorElement: <RouteError />,
    hydrateFallbackElement: <RouteFallback />,
    children: [
      { path: '/', Component: LandingPage },
      ...OCCASION_PAGES.map((p) => ({ path: `/${p.slug}`, element: <OccasionPage page={p} /> })),
      { path: '/login', lazy: page(() => import('@/features/auth/LoginPage')) },
      { path: '/signup', lazy: page(() => import('@/features/auth/SignupPage')) },
      {
        lazy: page(() => import('./AppShell')),
        children: [
          {
            errorElement: <RouteError />,
            children: [
              { path: '/dashboard', lazy: page(() => import('@/features/dashboard/DashboardPage')) },
              { path: '/events/new', lazy: page(() => import('@/features/events/CreateEventPage')) },
              { path: '/planner', lazy: page(() => import('@/features/planner/PlannerPage')) },
              {
                path: '/events/:eventId',
                lazy: page(() => import('@/features/events/EventLayout')),
                children: [
                  { index: true, lazy: page(() => import('@/features/events/EventOverviewPage')) },
                  { path: 'planner', lazy: page(() => import('@/features/planner/PlannerPage')) },
                  { path: 'budget', lazy: page(() => import('@/features/budget/BudgetPage')) },
                  { path: 'checklist', lazy: page(() => import('@/features/tasks/ChecklistPage')) },
                  { path: 'timeline', lazy: page(() => import('@/features/timeline/TimelinePage')) },
                  { path: 'invitation', lazy: page(() => import('@/features/invitations/InvitationPage')) },
                ],
              },
              { path: '/settings', lazy: page(() => import('@/features/settings/SettingsPage')) },
            ],
          },
        ],
      },
      {
        path: '*',
        loader: () => {
          throw new Response('Not found', { status: 404 })
        },
      },
    ],
  },
]
