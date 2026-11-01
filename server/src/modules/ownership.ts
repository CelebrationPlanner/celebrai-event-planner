import { todayInTimeZone } from '@celebrai/shared'
import { z } from 'zod'
import type { Db } from '../middleware/auth.ts'
import { invalid, notFound, unwrapMaybe } from '../lib/errors.ts'

const uuid = z.uuid()

/** Malformed ids get the same 404 as missing ones: no hint about what exists. */
export function parseId(value: unknown, what = 'Event'): string {
  const result = uuid.safeParse(value)
  if (!result.success) throw notFound(what)
  return result.data
}

/**
 * Loads an event the caller owns. RLS already hides other users' rows; the explicit
 * user_id filter is a second, independent check.
 */
export async function loadOwnedEvent(db: Db, userId: string, eventId: string) {
  const row = unwrapMaybe(await db.from('events').select('*').eq('id', eventId).eq('user_id', userId).maybeSingle())
  if (!row) throw notFound('Event')
  return row
}

/** "Today" in the caller's profile time zone (D8), for past-date checks. */
export async function userToday(db: Db, userId: string): Promise<string> {
  const profile = unwrapMaybe(await db.from('profiles').select('time_zone').eq('id', userId).maybeSingle())
  return todayInTimeZone(profile?.time_zone ?? 'Asia/Kolkata')
}

export function assertNotPast(date: string | null | undefined, today: string, path: string) {
  if (date && date < today) throw invalid('The date can’t be in the past.', path)
}
