import type { CelebrationEvent } from '@celebrai/shared'
import { describe, expect, it } from 'vitest'
import { INVITATION_TONES } from '@/types'
import { invitationTemplate, shareLinks } from './templates'

const event = {
  eventName: "Anaya's 5th Birthday",
  occasion: 'birthday',
  eventDate: '2026-11-13',
  location: 'Pune',
  themePreferences: ['Princess'],
} as CelebrationEvent

describe('invitationTemplate', () => {
  it.each(INVITATION_TONES)('writes a %s invitation from the event details', (tone) => {
    const text = invitationTemplate(event, tone)
    expect(text).toContain("Anaya's 5th Birthday")
    expect(text).toContain('13 Nov 2026')
    expect(text).toContain('Pune')
    expect(text.length).toBeLessThanOrEqual(2000)
  })

  it('uses placeholders instead of inventing missing details', () => {
    const text = invitationTemplate({ ...event, eventDate: null, location: '' }, 'formal')
    expect(text).toContain('[Date to be confirmed]')
    expect(text).toContain('[Venue to be confirmed]')
    expect(text).toContain('[Time]')
  })

  it('gives each tone distinct wording', () => {
    expect(new Set(INVITATION_TONES.map((t) => invitationTemplate(event, t))).size).toBe(4)
  })
})

describe('shareLinks', () => {
  it('encodes the text safely for WhatsApp and email', () => {
    const links = shareLinks('Party & cake? Yes!\nSee you', 'Anaya’s party')
    expect(links.whatsapp).toBe('https://wa.me/?text=Party%20%26%20cake%3F%20Yes!%0ASee%20you')
    expect(links.email).toBe('mailto:?subject=Anaya%E2%80%99s%20party&body=Party%20%26%20cake%3F%20Yes!%0ASee%20you')
  })
})
