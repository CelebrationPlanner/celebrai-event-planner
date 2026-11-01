import { eventUpdateSchema, isRealDate, type CelebrationEvent, type EventUpdate } from '@celebrai/shared'
import type { AiChat } from '../ai/schemas.ts'

export const PLACEHOLDER_NAME = 'New celebration'

const mergeTags = (current: string[], incoming: string[]) => {
  const seen = new Set(current.map((t) => t.toLowerCase()))
  return [...current, ...incoming.filter((t) => !seen.has(t.toLowerCase()) && seen.add(t.toLowerCase()))].slice(0, 10)
}

/** Whole currency units from the model → integer minor units, or null if it isn't a clean amount. */
function toMinor(amount: number | null): number | null {
  if (amount === null || !Number.isFinite(amount) || amount < 0) return null
  const minor = Math.round(amount * 100)
  return Number.isSafeInteger(minor) && Math.abs(minor - amount * 100) < 1e-6 ? minor : null
}

/**
 * Turns facts the model extracted into an event update. Every field is validated on its own
 * by the shared schema; anything invalid is dropped, never saved, so a confused or manipulated
 * model can't write bad data. Returns notes for problems the user should hear about.
 */
export function applyExtraction(current: CelebrationEvent | null, x: AiChat['extracted'], today: string): { patch: EventUpdate; notes: string[] } {
  const notes: string[] = []
  const candidate: Record<string, unknown> = {
    occasion: x.occasion ?? undefined,
    eventName: x.eventName && (!current || current.eventName === PLACEHOLDER_NAME) ? x.eventName : undefined,
    location: x.location ?? undefined,
    guestCount: x.guestCount ?? undefined,
    budgetMinor: toMinor(x.budgetAmount) ?? undefined,
    currency: x.currency ?? undefined,
    venuePreference: x.venuePreference ?? undefined,
    ageGroup: x.ageGroup ?? undefined,
    additionalInstructions: x.additionalInstructions ?? undefined,
  }
  if (x.eventDate && isRealDate(x.eventDate)) {
    if (x.eventDate >= today) candidate.eventDate = x.eventDate
    else notes.push('That date has already passed. What date is the event?')
  }
  if (x.themePreferences.length) candidate.themePreferences = mergeTags(current?.themePreferences ?? [], x.themePreferences)
  if (x.dietaryRequirements.length) candidate.dietaryRequirements = mergeTags(current?.dietaryRequirements ?? [], x.dietaryRequirements)

  const patch: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(candidate)) {
    if (value === undefined) continue
    const result = eventUpdateSchema.safeParse({ [key]: value })
    if (result.success) Object.assign(patch, result.data)
  }
  return { patch: patch as EventUpdate, notes }
}
