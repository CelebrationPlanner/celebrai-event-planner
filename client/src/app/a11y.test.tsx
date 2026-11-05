import { screen, waitFor } from '@testing-library/react'
import axe from 'axe-core'
import { describe, expect, it } from 'vitest'
import { renderApp } from '@/test/renderApp'

// jsdom has no layout engine, so colour contrast is checked separately (palette ratios are
// AA-verified in index.css) and again with Playwright + axe in the browser phase.
const PAGES: Array<[string, RegExp]> = [
  ['/', /every celebration starts with a plan/i],
  ['/birthday-party-planner', /birthday party budget planner/i],
  ['/wedding-budget-planner', /wedding budget planner/i],
  ['/baby-shower-planner', /baby shower planner/i],
  ['/anniversary-party-planner', /anniversary party planner/i],
  ['/signup', /create your account/i],
  ['/login', /welcome back/i],
  ['/dashboard', /hello, priya/i],
  ['/events/new', /create an event/i],
  ['/events/evt-birthday', /anaya's 5th birthday/i],
  ['/events/evt-birthday/planner', /anaya's 5th birthday/i],
  ['/events/evt-birthday/budget', /anaya's 5th birthday/i],
  ['/events/evt-birthday/checklist', /anaya's 5th birthday/i],
  ['/events/evt-birthday/timeline', /anaya's 5th birthday/i],
  ['/events/evt-birthday/invitation', /anaya's 5th birthday/i],
  ['/settings', /settings/i],
]

describe('axe accessibility scan', () => {
  it.each(PAGES)('%s has no violations', async (path, heading) => {
    renderApp(path, { signedIn: !['/', '/signup', '/login'].includes(path) })
    await screen.findByRole('heading', { level: 1, name: heading })
    await waitFor(() => expect(document.querySelector('[aria-busy="true"]')).toBeNull())
    const { violations } = await axe.run(document.body, { rules: { 'color-contrast': { enabled: false } } })
    expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([])
  })
})
