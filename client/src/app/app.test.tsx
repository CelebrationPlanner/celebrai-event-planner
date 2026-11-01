import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { addDays, todayISO } from '@/lib/dates'
import { renderApp } from '@/test/renderApp'

describe('Landing', () => {
  it('shows the headline and real CTAs', async () => {
    renderApp('/')
    expect(screen.getByRole('heading', { level: 1, name: 'Every Celebration Starts With a Plan.' })).toBeInTheDocument()
    const ctas = screen.getAllByRole('link', { name: /start planning/i })
    expect(ctas.every((a) => a.getAttribute('href') === '/events/new')).toBe(true)
    expect(screen.getByRole('link', { name: /weddings/i })).toHaveAttribute('href', '/events/new?occasion=wedding')
  })
})

describe('Create event wizard', () => {
  it('pre-selects the occasion from the URL and blocks invalid steps', async () => {
    const { user } = renderApp('/events/new?occasion=wedding')
    const occasion = await screen.findByLabelText('Occasion')
    expect(occasion).toHaveValue('wedding')

    await user.type(screen.getByLabelText('Date'), '2000-01-01')
    await user.click(screen.getByRole('button', { name: /next/i }))
    expect(screen.getByText('Give your event a name.')).toBeInTheDocument()
    expect(screen.getByText('The date can’t be in the past.')).toBeInTheDocument()
    expect(screen.getByLabelText('Event name')).toHaveAttribute('aria-invalid', 'true')
  })

  it('creates an event and opens it', async () => {
    const { user, router } = renderApp('/events/new')
    await user.selectOptions(await screen.findByLabelText('Occasion'), 'anniversary')
    await user.type(screen.getByLabelText('Event name'), 'Silver Jubilee')
    await user.type(screen.getByLabelText('Date'), addDays(todayISO(), 20))
    await user.click(screen.getByRole('button', { name: /next/i }))

    await user.type(screen.getByLabelText('Guest count'), '0')
    await user.type(screen.getByLabelText('Total budget'), '15000')
    await user.click(screen.getByRole('button', { name: /next/i }))
    expect(screen.getByText('Guests must be between 1 and 5,000.')).toBeInTheDocument()

    await user.clear(screen.getByLabelText('Guest count'))
    await user.type(screen.getByLabelText('Guest count'), '20')
    await user.click(screen.getByRole('button', { name: /next/i }))
    await user.click(screen.getByRole('button', { name: /next/i }))
    expect(screen.getByText('₹15,000')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /create event/i }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Silver Jubilee' })).toBeInTheDocument()
    expect(router.state.location.pathname).toMatch(/^\/events\/[\w-]+$/)
  })
})

describe('Checklist', () => {
  it('adds, completes, deletes and restores tasks', async () => {
    const { user } = renderApp('/events/demo-birthday/checklist')
    expect(await screen.findByText('1 of 8 done · 13%')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /add task/i }))
    expect(screen.getByText('Enter a task title (at least 2 characters).')).toBeInTheDocument()

    await user.type(screen.getByLabelText('Task'), 'Book face painter')
    await user.click(screen.getByRole('button', { name: /add task/i }))
    expect(await screen.findByText('Book face painter')).toBeInTheDocument()
    expect(screen.getByText('1 of 9 done · 11%')).toBeInTheDocument()

    await user.click(screen.getByRole('checkbox', { name: 'Book face painter' }))
    expect(screen.getByText('2 of 9 done · 22%')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Delete Book face painter' }))
    expect(screen.queryByRole('checkbox', { name: 'Book face painter' })).not.toBeInTheDocument()
    await user.click(await screen.findByRole('button', { name: 'Undo' }))
    expect(await screen.findByRole('checkbox', { name: 'Book face painter' })).toBeInTheDocument()
  })

  it('rejects a due date after the event', async () => {
    const { user } = renderApp('/events/demo-birthday/checklist')
    await user.type(await screen.findByLabelText('Task'), 'Late task')
    await user.type(screen.getByLabelText('Due date'), addDays(todayISO(), 40))
    await user.click(screen.getByRole('button', { name: /add task/i }))
    expect(screen.getByText('The due date must be on or before the event date.')).toBeInTheDocument()
  })
})

describe('Budget', () => {
  it('shows an exact overrun after an edit pushes allocations over budget', async () => {
    const { user } = renderApp('/events/demo-birthday/budget')
    await user.click(await screen.findByRole('button', { name: 'Edit Venue' }))
    const dialog = await screen.findByRole('dialog')
    const estimated = within(dialog).getByLabelText('Estimated')
    await user.clear(estimated)
    await user.type(estimated, '9000')
    await user.click(within(dialog).getByRole('button', { name: 'Save' }))

    expect((await screen.findByText('Over budget by')).parentElement).toHaveTextContent('Over budget by₹4,000')
    expect(screen.getByText('Budget overrun')).toBeInTheDocument()
  })

  it('rejects negative amounts', async () => {
    const { user } = renderApp('/events/demo-birthday/budget')
    await user.click(await screen.findByRole('button', { name: 'Edit Food & catering' }))
    const dialog = await screen.findByRole('dialog')
    await user.clear(within(dialog).getByLabelText('Estimated'))
    await user.type(within(dialog).getByLabelText('Estimated'), '-50')
    await user.click(within(dialog).getByRole('button', { name: 'Save' }))
    expect(within(dialog).getByText('Enter a non-negative amount (up to 2 decimals).')).toBeInTheDocument()
  })
})

describe('Invitation studio', () => {
  it('edits, saves and copies the invitation text', async () => {
    const { user } = renderApp('/events/demo-birthday/invitation')
    const editor = await screen.findByLabelText('Invitation text')
    expect(screen.getByRole('button', { name: 'Saved' })).toBeDisabled()

    await user.clear(editor)
    await user.type(editor, 'Join us for cake!')
    await user.click(screen.getByRole('button', { name: /save changes/i }))
    expect(screen.getByRole('button', { name: 'Saved' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: /copy/i }))
    expect(await navigator.clipboard.readText()).toBe('Join us for cake!')
  })
})

describe('Honest placeholders and errors', () => {
  it('disables AI actions and explains why', async () => {
    renderApp('/events/demo-anniversary')
    const generate = await screen.findByRole('button', { name: /generate plan/i })
    expect(generate).toBeDisabled()
    expect(generate).toHaveAccessibleDescription(/connected in an upcoming build phase/i)
  })

  it('validates auth forms without pretending to sign in', async () => {
    const { user } = renderApp('/login')
    await user.click(await screen.findByRole('button', { name: 'Log in' }))
    expect(screen.getByText('Enter a valid email address.')).toBeInTheDocument()
    await user.type(screen.getByLabelText('Email'), 'planner@example.com')
    await user.type(screen.getByLabelText('Password'), 'long-enough')
    await user.click(screen.getByRole('button', { name: 'Log in' }))
    expect(screen.getByText('Accounts aren’t connected yet')).toBeInTheDocument()
  })

  it('shows a not-found page for unknown routes', async () => {
    renderApp('/nope')
    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeInTheDocument()
  })

  it('shows the dashboard empty state after clearing demo data', async () => {
    const { user, router } = renderApp('/settings')
    await user.click(await screen.findByRole('button', { name: /clear all demo data/i }))
    await router.navigate('/dashboard')
    await waitFor(() => expect(screen.getByText('No events yet')).toBeInTheDocument())
  })
})
