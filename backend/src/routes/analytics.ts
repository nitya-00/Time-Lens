import { Router } from 'express'
import { getDashboard } from '../services/dashboard.js'
import { getPeriodAnalytics } from '../services/analytics.js'
import { getHabitAnalytics } from '../services/habits.js'
import { getLocalProfile } from '../lib/localProfile.js'
import { prisma } from '../lib/prisma.js'
import { z } from 'zod'

const router = Router()

router.get('/analytics/dashboard', async (request, response, next) => {
  try {
    const rawDate = typeof request.query.date === 'string' ? request.query.date : undefined
    const date = rawDate ? new Date(`${rawDate}T00:00:00.000Z`) : new Date()
    if (Number.isNaN(date.getTime())) return response.status(400).json({ message: 'Please use a valid date.' })
    response.json(await getDashboard(date))
  } catch (error) {
    next(error)
  }
})

router.get('/analytics/habits', async (_request, response, next) => {
  try { response.json(await getHabitAnalytics()) } catch (error) { next(error) }
})
router.put('/analytics/habits/override', async (request, response, next) => {
  try { const parsed = z.object({ habit: z.enum(['phoneBeforeSleep', 'phoneAfterWaking', 'productiveDay']), date: z.string().date(), completed: z.boolean() }).parse(request.body); const profile = await getLocalProfile(); const date = new Date(`${parsed.date}T00:00:00.000Z`); await prisma.habitOverride.upsert({ where: { userId_date_habit: { userId: profile.id, date, habit: parsed.habit } }, update: { completed: parsed.completed }, create: { userId: profile.id, date, habit: parsed.habit, completed: parsed.completed } }); response.status(204).send() } catch (error) { next(error) }
})

router.get('/analytics/:days', async (request, response, next) => {
  try {
    const days = Number(request.params.days)
    if (![7, 15, 30].includes(days)) return response.status(400).json({ message: 'Choose 7, 15, or 30 days.' })
    const rawDate = typeof request.query.date === 'string' ? request.query.date : undefined
    const date = rawDate ? new Date(`${rawDate}T00:00:00.000Z`) : new Date()
    if (Number.isNaN(date.getTime())) return response.status(400).json({ message: 'Please use a valid date.' })
    response.json(await getPeriodAnalytics(days, date))
  } catch (error) {
    next(error)
  }
})

export default router
