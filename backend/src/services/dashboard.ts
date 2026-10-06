import { CategoryGroup, type HourlyBlock } from '../generated/prisma/client.js'
import { getLocalProfile } from '../lib/localProfile.js'
import { prisma } from '../lib/prisma.js'
import { getOrCreateDailyLog } from './dailyLog.js'
import { categoryHours, distractionHours, isPlanComplete, isOptionalPlan, roundHours } from './timeRules.js'

const cardGroups = ['Work', 'Study', 'Sleep', 'House', 'Health', 'Personal', 'Fun', 'Other']

type BlockWithCategory = HourlyBlock & { category: { name: string; group: CategoryGroup } | null }

function startOfDay(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()))
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

function hoursForGroups(blocks: BlockWithCategory[], categories: string[]) {
  return roundHours(blocks.reduce((sum, block) => sum + categories.reduce((subtotal, category) => subtotal + categoryHours(block, category), 0), 0))
}

function change(current: number, previous: number) {
  if (previous === 0) return null
  return Number((((current - previous) / previous) * 100).toFixed(1))
}

export async function getDashboard(date = new Date()) {
  const profile = await getLocalProfile()
  const selectedDay = startOfDay(date)
  await getOrCreateDailyLog(profile.id, selectedDay)
  const yesterday = addDays(selectedDay, -1)
  const dayLogs = await prisma.dailyLog.findMany({
    where: { userId: profile.id, date: { in: [selectedDay, yesterday] } },
    include: { hourlyBlocks: { include: { category: true } } },
  })
  const todayBlocks = (dayLogs.find((log) => log.date.getTime() === selectedDay.getTime())?.hourlyBlocks ?? []) as BlockWithCategory[]
  const yesterdayBlocks = (dayLogs.find((log) => log.date.getTime() === yesterday.getTime())?.hourlyBlocks ?? []) as BlockWithCategory[]

  const cards = cardGroups.map((name) => {
    const hours = hoursForGroups(todayBlocks, [name])
    const previousHours = hoursForGroups(yesterdayBlocks, [name])
    return { name, hours, dayPercentage: Number(((hours / 24) * 100).toFixed(1)), changePercentage: change(hours, previousHours) }
  })
  const studyBreakdown = ['Study', 'Work', 'Sleep', 'House', 'Health', 'Personal', 'Fun', 'Other'].map((name) => ({
    name,
    hours: hoursForGroups(todayBlocks, [name]),
  })).filter((item) => item.hours > 0)

  const mondayOffset = (selectedDay.getUTCDay() + 6) % 7
  const weekStart = addDays(selectedDay, -mondayOffset)
  const elapsedDays = mondayOffset + 1
  const previousStart = addDays(weekStart, -elapsedDays)
  const weeklyLogs = await prisma.dailyLog.findMany({
    where: { userId: profile.id, date: { gte: previousStart, lte: selectedDay } },
    include: { hourlyBlocks: { include: { category: true } } },
  })
  const thisWeekBlocks = weeklyLogs.filter((log) => log.date >= weekStart).flatMap((log) => log.hourlyBlocks) as BlockWithCategory[]
  const previousWeekBlocks = weeklyLogs.filter((log) => log.date >= previousStart && log.date < weekStart).flatMap((log) => log.hourlyBlocks) as BlockWithCategory[]
  const weekly = cardGroups.map((name) => ({ name, hours: hoursForGroups(thisWeekBlocks, [name]), changePercentage: change(hoursForGroups(thisWeekBlocks, [name]), hoursForGroups(previousWeekBlocks, [name])) }))

  const filledHours = todayBlocks.filter((block) => block.categoryId).length
  const biggest = [...cards].sort((a, b) => b.hours - a.hours)[0]
  const insight = filledHours < 4
    ? 'Not enough data yet. Add a few completed hours to see a useful pattern.'
    : `${biggest.name} is your largest recorded category today at ${biggest.hours}h.`
  const recommendation = filledHours < 4
    ? 'Try logging the next few completed hours before reviewing the day.'
    : filledHours >= 18
      ? 'Breakthrough: you showed up for your day. Carry that promise gently into tomorrow.'
      : 'Nice work checking in with your day. One honest hour logged now makes tomorrow easier.'

  const challenge = await prisma.challenge.findFirst({
    where: { userId: profile.id }, orderBy: { startDate: 'desc' }, select: { targetDays: true, days: { select: { date: true } } },
  })
  const completedDays = new Set(challenge?.days.map((day) => day.date.toISOString().slice(0, 10)) ?? []).size
  const targetDays = challenge?.targetDays ?? 100

  const planned = todayBlocks.filter(block => !isOptionalPlan(block.plannedTask))
  const planComplete = planned.filter(isPlanComplete).length
  const distractedHours = roundHours(todayBlocks.reduce((sum, block) => sum + distractionHours(block), 0))
  return { date: selectedDay.toISOString().slice(0, 10), cards, studyBreakdown, weekly, insight, recommendation, celebration: filledHours >= 18 ? 'Wow — you did it. See you tomorrow.' : null, daily: { planned: planned.length, complete: planComplete, distractionHours: distractedHours, loggedHours: roundHours(todayBlocks.reduce((sum, block) => sum + (block.category ? 1 : 0), 0)) }, challenge: { completedDays, targetDays, percentage: Number(((completedDays / targetDays) * 100).toFixed(0)) } }
}
