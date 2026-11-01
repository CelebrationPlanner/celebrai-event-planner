import { profileUpdateSchema } from '@celebrai/shared'
import { Router } from 'express'
import { toProfile } from '../db/mappers.ts'
import { notFound, unwrapMaybe } from '../lib/errors.ts'
import { getAuth } from '../middleware/auth.ts'

export const profileRouter = Router()

profileRouter.get('/profile', async (req, res) => {
  const { db, userId } = getAuth(req)
  const row = unwrapMaybe(await db.from('profiles').select('*').eq('id', userId).maybeSingle())
  if (!row) throw notFound('Profile')
  res.json({ data: toProfile(row) })
})

profileRouter.patch('/profile', async (req, res) => {
  const { db, userId } = getAuth(req)
  const p = profileUpdateSchema.parse(req.body)
  const row = unwrapMaybe(
    await db
      .from('profiles')
      .update({ display_name: p.displayName, time_zone: p.timeZone, default_currency: p.defaultCurrency })
      .eq('id', userId)
      .select()
      .maybeSingle(),
  )
  if (!row) throw notFound('Profile')
  res.json({ data: toProfile(row) })
})
