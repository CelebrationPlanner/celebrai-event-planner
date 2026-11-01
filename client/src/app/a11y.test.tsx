import { screen } from '@testing-library/react'
import axe from 'axe-core'
import { describe, expect, it } from 'vitest'
import { renderApp } from '@/test/renderApp'

// jsdom has no layout engine, so colour contrast is checked separately (palette ratios are
// AA-verified in index.css) and again with Playwright + axe in the browser phase.
const PAGES: Array<[string, RegExp]> = [
  ['/', /every celebration starts with a plan/i],
  ['/signup', /create your account/i],
  ['/dashboard', /hello, demo planner/i],
  ['/events/new', /create an event/i],
  ['/events/demo-birthday', /anaya's 5th birthday/i],
  ['/events/demo-birthday/planner', /anaya's 5th birthday/i],
  ['/events/demo-birthday/budget', /anaya's 5th birthday/i],
  ['/events/demo-birthday/checklist', /anaya's 5th birthday/i],
  ['/events/demo-birthday/timeline', /anaya's 5th birthday/i],
  ['/events/demo-birthday/invitation', /anaya's 5th birthday/i],
  ['/settings', /settings/i],
]

describe('axe accessibility scan', () => {
  it.each(PAGES)('%s has no violations', async (path, heading) => {
    renderApp(path)
    await screen.findByRole('heading', { level: 1, name: heading })
    const { violations } = await axe.run(document.body, { rules: { 'color-contrast': { enabled: false } } })
    expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([])
  })
})
