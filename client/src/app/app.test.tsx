import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { addDays, todayISO } from '@/lib/dates'
import { db } from '@/test/fakeBackend'
import { renderApp } from '@/test/renderApp'

describe('Landing', () => {
  it('shows the headline and real CTAs', async () => {
    renderApp('/', { signedIn: false })
    expect(screen.getByRole('heading', { level: 1, name: 'Every Celebration Starts With a Plan.' })).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /start planning/i }).every((a) => a.getAttribute('href') === '/events/new')).toBe(true)
    expect(screen.getByRole('link', { name: /weddings/i })).toHaveAttribute('href', '/events/new?occasion=wedding')
    expect(screen.getByRole('button', { name: 'Explore the demo' })).toBeEnabled()
  })

  it('starts an isolated demo session and opens the dashboard', async () => {
    const { user, router } = renderApp('/', { signedIn: false })
    await user.click(screen.getByRole('button', { name: 'Explore the demo' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/dashboard'))
    expect(await screen.findByText(/Demo account\./)).toBeInTheDocument()
  })
})

describe('Authentication and protected routes', () => {
  it('sends signed-out visitors to login and back to where they were going', async () => {
    const { user, router } = renderApp('/events/evt-birthday/budget', { signedIn: false })
    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument()
    expect(router.state.location.search).toBe('?next=%2Fevents%2Fevt-birthday%2Fbudget')

    await user.type(screen.getByLabelText('Email'), 'priya@example.com')
    await user.type(screen.getByLabelText('Password'), 'wrong-password')
    await user.click(screen.getByRole('button', { name: 'Log in' }))
    expect(await screen.findByText('Email or password is incorrect.')).toBeInTheDocument()

    await user.clear(screen.getByLabelText('Password'))
    await user.type(screen.getByLabelText('Password'), 'correct-password')
    await user.click(screen.getByRole('button', { name: 'Log in' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/events/evt-birthday/budget'))
  })

  it('validates the signup form before contacting the server', async () => {
    const { user } = renderApp('/signup', { signedIn: false })
    await user.click(await screen.findByRole('button', { name: 'Create account' }))
    expect(screen.getByText('Enter your name.')).toBeInTheDocument()
    expect(screen.getByText('Enter a valid email address.')).toBeInTheDocument()
  })

  it('logs out and protects screens again', async () => {
    const { user, router } = renderApp('/settings')
    await user.click(within(await screen.findByRole('main')).getByRole('button', { name: /^log out$/i }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'))
  })
})

describe('Dashboard', () => {
  it('shows live totals, events and progress', async () => {
    renderApp('/dashboard')
    expect(await screen.findByRole('heading', { name: 'Hello, Priya' })).toBeInTheDocument()
    expect(await screen.findByText('₹40,000')).toBeInTheDocument()
    expect(screen.getByText('1/4 tasks · 25%')).toBeInTheDocument()
  })
})

describe('Create event wizard', () => {
  it('pre-selects the occasion and blocks invalid steps', async () => {
    const { user } = renderApp('/events/new?occasion=wedding')
    expect(await screen.findByLabelText('Occasion')).toHaveValue('wedding')
    await user.type(screen.getByLabelText('Date'), '2000-01-01')
    await user.click(screen.getByRole('button', { name: /next/i }))
    expect(screen.getByText('Give your event a name.')).toBeInTheDocument()
    expect(screen.getByText('The date can’t be in the past.')).toBeInTheDocument()
  })

  it('creates the event through the API and opens it', async () => {
    const { user, router } = renderApp('/events/new')
    await user.selectOptions(await screen.findByLabelText('Occasion'), 'anniversary')
    await user.type(screen.getByLabelText('Event name'), 'Silver Jubilee')
    await user.type(screen.getByLabelText('Date'), addDays(todayISO(), 20))
    await user.click(screen.getByRole('button', { name: /next/i }))
    await user.type(screen.getByLabelText('Guest count'), '20')
    await user.type(screen.getByLabelText('Total budget'), '15000')
    await user.click(screen.getByRole('button', { name: /next/i }))
    await user.click(screen.getByRole('button', { name: /next/i }))
    await user.click(screen.getByRole('button', { name: /create event/i }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Silver Jubilee' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/events/evt-3')
    expect(db.events.at(-1)).toMatchObject({ eventName: 'Silver Jubilee', budgetMinor: 1_500_000, guestCount: 20 })
  })
})

describe('Event overview and plan generation', () => {
  it('shows the saved plan with the engine’s decisions', async () => {
    renderApp('/events/evt-birthday')
    expect(await screen.findByText('Pastel Princess Garden', { exact: false })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /How CelebrAI decided/ })).toBeInTheDocument()
    expect(screen.getByText('Children attending')).toBeInTheDocument()
  })

  it('reports clearly when the AI is unavailable (no fake plan)', async () => {
    const { user } = renderApp('/events/evt-anniversary')
    await user.click(await screen.findByRole('button', { name: 'Generate plan' }))
    expect(await screen.findByText('The AI planner is unavailable right now. Please try again shortly.')).toBeInTheDocument()
  })

  it('shows follow-up questions when details are missing (Scenario 7)', async () => {
    const { user } = renderApp('/events/evt-anniversary')
    db.generateResult = { kind: 'clarification', missing: ['eventDate'], questions: ['What date is the event?'] }
    await user.click(await screen.findByRole('button', { name: 'Generate plan' }))
    expect(await screen.findByText('What date is the event?')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Answer in the assistant' })).toHaveAttribute('href', '/events/evt-anniversary/planner')
  })

  it('shows a not-found state for events that do not exist or belong to someone else', async () => {
    renderApp('/events/someone-elses-event')
    expect(await screen.findByRole('heading', { name: 'Event not found' })).toBeInTheDocument()
  })
})

describe('Assistant', () => {
  it('sends a message and shows what is still missing', async () => {
    const { user } = renderApp('/events/evt-anniversary/planner')
    db.chatResult = (_message, event) => {
      Object.assign(event, { eventDate: null })
      return { reply: 'Lovely!\n\nWhat date is the event?', questions: ['What date is the event?'], missing: ['eventDate'], readyToGenerate: false }
    }
    await user.type(await screen.findByLabelText('Message the assistant'), 'Dinner for 20 in Mumbai{Enter}')
    expect(await screen.findByText(/Lovely!/)).toBeInTheDocument()
    expect(await screen.findByText('What date is the event? I need it to build a realistic schedule.')).toBeInTheDocument()
  })

  it('keeps the message and explains when the AI is unavailable', async () => {
    const { user } = renderApp('/events/evt-anniversary/planner')
    const box = await screen.findByLabelText('Message the assistant')
    await user.type(box, 'Hello{Enter}')
    expect(await screen.findByText(/AI planner is unavailable/)).toBeInTheDocument()
    expect(box).toHaveValue('Hello')
  })
})

describe('Checklist', () => {
  it('adds, completes, deletes and restores tasks through the API', async () => {
    const { user } = renderApp('/events/evt-birthday/checklist')
    expect(await screen.findByText('1 of 4 done · 25%')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /add task/i }))
    expect(screen.getByText('Enter a task title (at least 2 characters).')).toBeInTheDocument()

    await user.type(screen.getByLabelText('Task'), 'Book face painter')
    await user.click(screen.getByRole('button', { name: /add task/i }))
    expect(await screen.findByRole('checkbox', { name: 'Book face painter' })).toBeInTheDocument()
    expect(db.tasks.some((t) => t.title === 'Book face painter')).toBe(true)

    await user.click(screen.getByRole('checkbox', { name: 'Book face painter' }))
    expect(await screen.findByText('2 of 5 done · 40%')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Delete Book face painter' }))
    await waitFor(() => expect(screen.queryByRole('checkbox', { name: 'Book face painter' })).not.toBeInTheDocument())
    await user.click(await screen.findByRole('button', { name: 'Undo' }))
    expect(await screen.findByRole('checkbox', { name: 'Book face painter' })).toBeInTheDocument()
  })
})

describe('Budget', () => {
  it('shows the server-calculated overrun after an edit', async () => {
    const { user } = renderApp('/events/evt-birthday/budget')
    await user.click(await screen.findByRole('button', { name: 'Edit Venue' }))
    const dialog = await screen.findByRole('dialog')
    await user.clear(within(dialog).getByLabelText('Estimated'))
    await user.type(within(dialog).getByLabelText('Estimated'), '9000')
    await user.click(within(dialog).getByRole('button', { name: 'Save' }))

    expect((await screen.findByText('Over budget by')).parentElement).toHaveTextContent('Over budget by₹4,000')
    expect(screen.getByText(/exceed the total budget by ₹4,000/)).toBeInTheDocument()
  })

  it('rejects negative amounts before sending', async () => {
    const { user } = renderApp('/events/evt-birthday/budget')
    await user.click(await screen.findByRole('button', { name: 'Edit Food & catering' }))
    const dialog = await screen.findByRole('dialog')
    await user.clear(within(dialog).getByLabelText('Estimated'))
    await user.type(within(dialog).getByLabelText('Estimated'), '-50')
    await user.click(within(dialog).getByRole('button', { name: 'Save' }))
    expect(within(dialog).getByText('Enter a non-negative amount (up to 2 decimals).')).toBeInTheDocument()
  })
})

describe('Invitation studio', () => {
  it('saves edited text to the event and copies it', async () => {
    const { user } = renderApp('/events/evt-birthday/invitation')
    const editor = await screen.findByLabelText('Invitation text')
    await user.clear(editor)
    await user.type(editor, 'Join us for cake!')
    await user.click(screen.getByRole('button', { name: /save changes/i }))
    expect(await screen.findByRole('button', { name: 'Saved' })).toBeDisabled()
    expect(db.events[0].invitationText).toBe('Join us for cake!')

    await user.click(screen.getByRole('button', { name: /copy/i }))
    expect(await navigator.clipboard.readText()).toBe('Join us for cake!')
  })
})

describe('Routing', () => {
  it('shows a not-found page for unknown routes', async () => {
    renderApp('/nope')
    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeInTheDocument()
  })
})
