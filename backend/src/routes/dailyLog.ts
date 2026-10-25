import { Router } from 'express'
import { z } from 'zod'
import { DistractionType } from '../generated/prisma/client.js'
import { getLocalProfile } from '../lib/localProfile.js'
import { prisma } from '../lib/prisma.js'
import { getOrCreateDailyLog, updateHourlyBlock } from '../services/dailyLog.js'
import { getUserCategories } from '../services/categories.js'
import { readDistractionOptions } from '../services/categories.js'
import { todayInTimeZone } from '../lib/dates.js'

const router = Router()
const distractionValues = Object.values(DistractionType) as [DistractionType, ...DistractionType[]]
const updateBlockSchema = z.object({
  categoryId: z.string().cuid().nullable().optional(),
  activity: z.string().trim().max(160).nullable().optional(),
  plannedTask: z.string().trim().max(160).nullable().optional(),
  distraction: z.enum(distractionValues).optional(),
  customDistraction: z.string().trim().min(1).max(40).nullable().optional(),
  missedPlanReason: z.string().trim().max(240).nullable().optional(),
})

function parseDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const date = new Date(`${value}T00:00:00.000Z`)
  return Number.isNaN(date.getTime()) ? null : date
}

function toDailyLogResponse(log: Awaited<ReturnType<typeof getOrCreateDailyLog>>, profile: Awaited<ReturnType<typeof getLocalProfile>>, categories: Awaited<ReturnType<typeof getUserCategories>>) {
  return {
    date: log.date.toISOString().slice(0, 10),
    blocks: log.hourlyBlocks.map((block) => ({
      hourIndex: block.hourIndex,
      category: block.category ? { name: block.category.name } : null,
      categoryId: block.categoryId,
      activity: block.activity,
      plannedTask: block.plannedTask,
      distraction: block.distraction,
      customDistraction: block.customDistraction,
      missedPlanReason: block.missedPlanReason,
    })),
    categories: categories.map((category) => ({ name: category.name, id: category.id })),
    distractionOptions: readDistractionOptions(profile.distractionOptions),
  }
}

router.get('/categories', async (_request, response, next) => {
  try {
    const profile = await getLocalProfile()
    const categories = await getUserCategories(profile.id)
    response.json({ categories: categories.map((category) => ({ name: category.name, id: category.id })) })
  } catch (error) {
    next(error)
  }
})

router.get('/daily-log/today', async (_request, response, next) => {
  try {
    const profile = await getLocalProfile()
    const [log, categories] = await Promise.all([getOrCreateDailyLog(profile.id, todayInTimeZone(profile.timeZone)), getUserCategories(profile.id)])
    response.json(toDailyLogResponse(log, profile, categories))
  } catch (error) {
    next(error)
  }
})

router.get('/daily-log/:date', async (request, response, next) => {
  try {
    const date = parseDate(request.params.date)
    if (!date) return response.status(400).json({ message: 'Please use a date in YYYY-MM-DD format.' })

    const profile = await getLocalProfile()
    const [log, categories] = await Promise.all([getOrCreateDailyLog(profile.id, date), getUserCategories(profile.id)])
    response.json(toDailyLogResponse(log, profile, categories))
  } catch (error) {
    next(error)
  }
})

router.patch('/daily-log/:date/blocks/:hourIndex', async (request, response, next) => {
  try {
    const date = parseDate(request.params.date)
    const hourIndex = Number(request.params.hourIndex)
    if (!date || !Number.isInteger(hourIndex) || hourIndex < 0 || hourIndex > 23) {
      return response.status(400).json({ message: 'Please choose a valid date and hour.' })
    }

    const parsed = updateBlockSchema.safeParse(request.body)
    if (!parsed.success) return response.status(400).json({ message: 'Please check the values in this hourly block.' })

    const profile = await getLocalProfile()
    if (parsed.data.categoryId) {
      const category = await prisma.category.findFirst({ where: { id: parsed.data.categoryId, userId: profile.id } })
      if (!category) return response.status(400).json({ message: 'Please choose one of your own categories.' })
    }
    if (parsed.data.distraction !== DistractionType.OTHER && parsed.data.customDistraction) {
      return response.status(400).json({ message: 'Custom distraction labels use the Other option.' })
    }
    const log = await getOrCreateDailyLog(profile.id, date)
    const block = await updateHourlyBlock(log.id, hourIndex, parsed.data)
    response.json({
      hourIndex: block.hourIndex,
      category: block.category ? { name: block.category.name } : null,
      categoryId: block.categoryId,
      activity: block.activity,
      plannedTask: block.plannedTask,
      distraction: block.distraction,
      customDistraction: block.customDistraction,
      missedPlanReason: block.missedPlanReason,
    })
  } catch (error) {
    next(error)
  }
})

export default router
