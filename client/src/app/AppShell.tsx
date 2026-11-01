import { CalendarPlus, Info, LayoutDashboard, Menu, Settings, Sparkles } from 'lucide-react'
import * as m from 'motion/react-m'
import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigation } from 'react-router'
import { Logo } from '@/components/Logo'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { useDemoStore } from '@/demo/DemoStore'

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/events/new', label: 'New event', icon: CalendarPlus },
  { to: '/planner', label: 'AI assistant', icon: Sparkles },
  { to: '/settings', label: 'Settings', icon: Settings },
]

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none ${
    isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
  }`

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const { events } = useDemoStore()
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
      <div>
        <p className="px-3 pb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Your events</p>
        {events.length === 0 ? (
          <p className="px-3 text-sm text-muted-foreground">No events yet.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {events.map((e) => (
              <li key={e.id}>
                <NavLink to={`/events/${e.id}`} className={linkClass} onClick={onNavigate}>
                  <span className="truncate">{e.eventName}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        )}
      </div>
    </nav>
  )
}

export default function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { pathname } = useLocation()
  const navigation = useNavigation()

  return (
    <div className="min-h-dvh lg:pl-64">
      <a href="#main" className="sr-only z-50 rounded-md bg-primary px-3 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-2 focus:left-2">
        Skip to content
      </a>
      {navigation.state === 'loading' && <div className="fixed inset-x-0 top-0 z-50 h-0.5 animate-pulse bg-primary" aria-hidden="true" />}

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
          <SheetContent side="left" className="w-72 p-5">
            <SheetHeader className="p-0">
              <SheetTitle>
                <Logo to="/dashboard" />
              </SheetTitle>
            </SheetHeader>
            <SidebarNav onNavigate={() => setMenuOpen(false)} />
          </SheetContent>
        </Sheet>
      </header>

      <aside aria-label="Demo data notice" className="border-b bg-gold-soft px-4 py-2 text-sm text-gold-foreground">
        <div className="mx-auto flex max-w-6xl items-center gap-2">
          <Info className="size-4 shrink-0" aria-hidden="true" />
          <p>
            <strong>Demo data.</strong> You’re exploring sample events. Changes stay in this tab and reset on refresh.{' '}
            <Link to="/settings" className="underline underline-offset-2">
              Manage demo
            </Link>
          </p>
        </div>
      </aside>

      <m.main
        id="main"
        key={pathname.split('/').slice(0, 3).join('/')}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:py-8"
      >
        <Outlet />
      </m.main>
    </div>
  )
}
