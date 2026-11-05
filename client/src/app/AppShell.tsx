import { CalendarPlus, Info, LayoutDashboard, LogOut, Menu, Settings, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { Link, Navigate, NavLink, Outlet, useLocation, useNavigation } from 'react-router'
import { Logo } from '@/components/Logo'
import { RouteFallback } from '@/components/RouteStates'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { useDashboard } from '@/lib/queries'
import { supabase } from '@/lib/supabase'
import { useAuth } from './session'

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/events/new', label: 'New event', icon: CalendarPlus },
  { to: '/planner', label: 'AI assistant', icon: Sparkles },
  { to: '/settings', label: 'Settings', icon: Settings },
]

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ` +
  `focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none ${
    isActive
      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
  }`

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const { data } = useDashboard()
  const { session } = useAuth()
  return (
    <nav aria-label="Main" className="flex flex-1 flex-col gap-6">
      <ul className="flex flex-col gap-1">
        {NAV.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <NavLink to={to} end className={linkClass} onClick={onNavigate}>
              <Icon className="size-4" aria-hidden="true" />
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
      <div className="flex-1">
        <p className="px-3 pb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Your events</p>
        {!data ? null : data.events.length === 0 ? (
          <p className="px-3 text-sm text-muted-foreground">No events yet.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {data.events.map((e) => (
              <li key={e.id}>
                <NavLink to={`/events/${e.id}`} className={linkClass} onClick={onNavigate}>
                  <span className="truncate">{e.eventName}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="border-t pt-4">
        <p className="truncate px-3 pb-2 text-xs text-muted-foreground">
          {session?.user.is_anonymous ? 'Demo account' : session?.user.email}
        </p>
        <button
          type="button"
          onClick={() => supabase.auth.signOut()}
          className={linkClass({ isActive: false }) + ' w-full'}
        >
          <LogOut className="size-4" aria-hidden="true" />
          {session?.user.is_anonymous ? 'Exit demo' : 'Log out'}
        </button>
      </div>
    </nav>
  )
}

/** Layout for every signed-in screen. Unauthenticated visitors are sent to login, then back. */
export default function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { pathname } = useLocation()
  const navigation = useNavigation()
  const { session, loading } = useAuth()

  if (loading) return <RouteFallback />
  if (!session) return <Navigate to={`/login?next=${encodeURIComponent(pathname)}`} replace />

  return (
    <div className="min-h-dvh lg:pl-64">
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-primary px-3 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Skip to content
      </a>
      {navigation.state === 'loading' && (
        <div className="fixed inset-x-0 top-0 z-50 h-0.5 animate-pulse bg-primary" aria-hidden="true" />
      )}

      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col gap-8 border-r bg-sidebar p-5 lg:flex">
        <Logo to="/dashboard" />
        <SidebarNav />
      </aside>

      <header className="sticky top-0 z-40 flex items-center justify-between border-b bg-background/90 px-4 py-3 backdrop-blur lg:hidden">
        <Logo to="/dashboard" />
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Open menu">
              <Menu />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="flex w-72 flex-col p-5">
            <SheetHeader className="p-0">
              <SheetTitle>
                <Logo to="/dashboard" />
              </SheetTitle>
            </SheetHeader>
            <SidebarNav onNavigate={() => setMenuOpen(false)} />
          </SheetContent>
        </Sheet>
      </header>

      {session.user.is_anonymous && (
        <aside
          aria-label="Demo account notice"
          className="border-b bg-gold-soft px-4 py-2 text-sm text-gold-foreground"
        >
          <div className="mx-auto flex max-w-6xl items-center gap-2">
            <Info className="size-4 shrink-0" aria-hidden="true" />
            <p>
              <strong>Demo account.</strong> Your data is private but temporary.{' '}
              <Link to="/signup" className="underline underline-offset-2">
                Create an account
              </Link>{' '}
              to keep your plans.
            </p>
          </div>
        </aside>
      )}

      <main
        id="main"
        key={pathname.split('/').slice(0, 3).join('/')}
        className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:py-8"
      >
        <Outlet />
      </main>
    </div>
  )
}
