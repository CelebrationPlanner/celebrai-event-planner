// Main user journey against the real API and database (docs/TESTING_PLAN.md §7).
// AI generation steps are covered once a Gemini key is configured; here the app must
// explain that AI is unavailable without breaking anything else.
import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

const inDays = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10)

async function expectNoAxeViolations(page: Page) {
  // Scan the settled page: elements mid fade-in are translucent and would fail contrast checks.
  await page.waitForFunction(() =>
    document.getAnimations().every((a) => a.playState !== 'running' || a.effect?.getTiming().iterations === Infinity),
  )
  // Real browser: colour contrast is checked here too.
  const { violations } = await new AxeBuilder({ page }).analyze()
  expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([])
}

test('sign up → create event → budget → checklist → invitation → refresh → log out', async ({ page }) => {
  const email = `e2e-${Date.now()}@celebrai.test`

  await page.goto('/')
  await expectNoAxeViolations(page)
  await page.getByRole('link', { name: 'Start planning' }).first().click()

  // Protected route → login → sign up, then straight back to the wizard.
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible()
  await page.getByRole('link', { name: 'Create an account' }).click()
  await page.getByLabel('Name').fill('E2E Planner')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill('a-strong-password')
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page.getByRole('heading', { name: 'Create an event' })).toBeVisible()

  // Wizard
  await page.getByLabel('Occasion').selectOption('birthday')
  await page.getByLabel('Event name').fill('E2E Birthday')
  await page.getByLabel('Date').fill(inDays(20))
  await page.getByLabel('Location').fill('Pune')
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByLabel('Guest count').fill('30')
  await page.getByLabel('Total budget').fill('15000')
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByRole('button', { name: 'Create event' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'E2E Birthday' })).toBeVisible()
  const eventUrl = page.url()

  // No AI key in this environment: generation must fail clearly, not fake a plan.
  await page.getByRole('button', { name: 'Generate plan' }).click()
  await expect(page.getByText('The AI planner is unavailable right now. Please try again shortly.')).toBeVisible()

  // Budget: set up categories, then push allocations over the budget.
  await page.getByRole('link', { name: 'Budget' }).click()
  await page.getByRole('button', { name: 'Set up categories manually' }).click()
  for (const [category, amount] of [
    ['Venue', '9000'],
    ['Food & catering', '7000'],
  ]) {
    await page.getByRole('button', { name: `Edit ${category}` }).click()
    await page.getByRole('dialog').getByLabel('Estimated').fill(amount)
    await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click()
    await expect(page.getByRole('dialog')).toBeHidden()
  }
  await expect(page.getByText('Over budget by')).toBeVisible()
  await expect(page.getByText(/exceed the total budget by ₹1,000/)).toBeVisible()

  // Checklist
  await page.getByRole('link', { name: 'Checklist' }).click()
  await page.getByLabel('Task', { exact: true }).fill('Book the magician')
  await page.getByRole('button', { name: 'Add task' }).click()
  await page.getByRole('checkbox', { name: 'Book the magician' }).click()
  await expect(page.getByText('1 of 1 done · 100%')).toBeVisible()

  // Invitation
  await page.getByRole('link', { name: 'Invitation' }).click()
  await page.getByLabel('Invitation text').fill('Join us for an E2E birthday!')
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.getByRole('button', { name: 'Saved' })).toBeVisible()

  // Everything survives a full reload (it is in the database, not the browser).
  await page.reload()
  await expect(page.getByLabel('Invitation text')).toHaveValue('Join us for an E2E birthday!')
  await page.goto(`${eventUrl}/checklist`)
  await expect(page.getByRole('checkbox', { name: 'Book the magician' })).toBeChecked()
  await page.goto(`${eventUrl}/budget`)
  await expect(page.getByText('Over budget by')).toBeVisible()
  await page.goto('/dashboard')
  await expect(page.getByText('E2E Birthday').first()).toBeVisible()
  await expectNoAxeViolations(page)

  // Logging out removes access to protected screens.
  await page.getByRole('button', { name: 'Log out' }).click()
  await page.goto(eventUrl)
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible()
})

test('demo: isolated sample event with an engine-built plan', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Explore the demo' }).click()
  await expect(page.getByText('Demo account.')).toBeVisible()
  await page.getByRole('link', { name: "Anaya's 5th Birthday (sample)" }).first().click()
  await expect(page.getByText(/^Sample plan:/)).toBeVisible()
  await expect(page.getByRole('heading', { name: /How CelebrAI decided/ })).toBeVisible()
  await expect(page.getByText('Children attending')).toBeVisible()
  await expectNoAxeViolations(page)
})

test('mobile: dashboard and event screens fit the viewport @mobile', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Explore the demo' }).click()
  await expect(page.getByText('Demo account.')).toBeVisible()
  for (const path of ['', '/budget', '/checklist', '/timeline', '/invitation', '/planner']) {
    await page.getByRole('button', { name: 'Open menu' }).click()
    await page.getByRole('link', { name: "Anaya's 5th Birthday (sample)" }).click()
    if (path)
      await page
        .getByRole('link', {
          name: path
            .slice(1)
            .replace(/^./, (c) => c.toUpperCase())
            .replace('Planner', 'Assistant'),
        })
        .click()
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow, `horizontal overflow on ${path || 'overview'}`).toBeLessThanOrEqual(0)
  }
})

// Presses Tab until `target` has focus, so the test proves the control is reachable by keyboard.
async function tabTo(page: Page, target: ReturnType<Page['getByRole']>, max = 60) {
  for (let i = 0; i < max; i++) {
    await page.keyboard.press('Tab')
    if (await target.evaluate((el) => el === document.activeElement).catch(() => false)) return
  }
  throw new Error(`Not reachable with ${max} Tab presses: ${target}`)
}

const focusIsVisible = (page: Page) =>
  page.evaluate(() => {
    const style = getComputedStyle(document.activeElement as Element)
    return style.outlineStyle !== 'none' || style.boxShadow !== 'none'
  })

test('keyboard: demo, skip link, event tabs and dialog focus without a mouse (A11Y-01)', async ({ page }) => {
  await page.goto('/')
  const demo = page.getByRole('button', { name: 'Explore the demo' })
  await tabTo(page, demo)
  expect(await focusIsVisible(page)).toBe(true)
  await page.keyboard.press('Enter')
  await expect(page.getByText('Demo account.')).toBeVisible()

  // The skip link is the first stop and moves the next Tab into the main content.
  await page.reload()
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused()
  await page.keyboard.press('Enter')
  await page.keyboard.press('Tab')
  expect(await page.evaluate(() => document.getElementById('main')?.contains(document.activeElement))).toBe(true)

  await tabTo(page, page.getByRole('main').getByRole('link', { name: "Anaya's 5th Birthday (sample)", exact: true }))
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { level: 1, name: "Anaya's 5th Birthday (sample)" })).toBeVisible()
  await tabTo(page, page.getByRole('link', { name: 'Budget', exact: true }))
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/budget$/)

  // A dialog keeps focus inside while open and returns it to its trigger on Escape.
  const edit = page.getByRole('button', { name: 'Edit Venue' })
  await tabTo(page, edit)
  expect(await focusIsVisible(page)).toBe(true)
  await page.keyboard.press('Enter')
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  for (let i = 0; i < 12; i++) {
    expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true)
    await page.keyboard.press('Tab')
  }
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(edit).toBeFocused()
})

test('engine suggestions and plan editing work without AI', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Explore the demo' }).click()
  await expect(page.getByText('Demo account.')).toBeVisible()

  // A new outdoor event: suggested split and tasks come straight from the engine.
  await page.goto('/events/new')
  await page.getByLabel('Occasion').selectOption('anniversary')
  await page.getByLabel('Event name').fill('Garden anniversary')
  await page.getByLabel('Date').fill(inDays(8))
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByLabel('Guest count').fill('25')
  await page.getByLabel('Total budget').fill('20000')
  await page.getByText('outdoor', { exact: true }).click()
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByRole('button', { name: 'Create event' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Garden anniversary' })).toBeVisible()

  await page.getByRole('link', { name: 'Budget' }).click()
  await page.getByRole('button', { name: 'Use suggested split' }).click()
  const split = page.getByRole('dialog')
  await expect(split.getByText('Outdoor venue')).toBeVisible()
  await expect(split.getByRole('row', { name: /^Total/ })).toContainText('₹20,000')
  await split.getByRole('button', { name: 'Apply this split' }).click()
  // The engine allocated exactly the whole budget.
  await expect(page.getByText('Unallocated').locator('..')).toHaveText('Unallocated₹0')

  await page.getByRole('link', { name: 'Checklist' }).click()
  await page.getByRole('button', { name: 'Suggest tasks' }).click()
  const suggested = page.getByRole('dialog')
  await expect(suggested.getByRole('checkbox', { name: /weather backup/i })).toBeChecked()
  await suggested.getByRole('button', { name: /^Add \d+ tasks$/ }).click()
  await expect(page.getByRole('checkbox', { name: /weather backup/i })).toBeVisible()
  await expect(page.getByText(/^0 of (1[0-9]) done/)).toBeVisible()

  // Plan editing on the sample event: the edited agenda is saved as a new version.
  await page.goto('/dashboard')
  await page.getByRole('link', { name: "Anaya's 5th Birthday (sample)" }).first().click()
  await page.getByRole('link', { name: 'Timeline' }).click()
  await page.getByRole('button', { name: 'Edit schedule' }).click()
  await page.getByRole('button', { name: 'Add item' }).click()
  const last = await page.getByRole('list', { name: 'Agenda items' }).getByRole('listitem').count()
  await page.getByLabel(`Time for item ${last}`).fill('14:30')
  await page.getByLabel(`Activity for item ${last}`).fill('Family photos before guests arrive')
  await page.getByRole('button', { name: 'Save schedule' }).click()
  await expect(page.getByText('Schedule saved as plan version 2')).toBeVisible()
  await page.reload()
  await expect(page.getByRole('listitem').filter({ hasText: 'Family photos before guests arrive' })).toContainText(
    '14:30',
  )
})
