import { CategoryGroup, DistractionType, type HourlyBlock } from '../generated/prisma/client.js'
import { getLocalProfile } from '../lib/localProfile.js'
import { prisma } from '../lib/prisma.js'
import { categoryHours, distractionHours, isDistraction, isPlanComplete, isOptionalPlan, roundHours } from './timeRules.js'

const groups = ['Study', 'Work', 'Sleep', 'House', 'Health', 'Personal', 'Fun', 'Other']
type Block = HourlyBlock & { category: { name: string; group: CategoryGroup } | null }

const day = (value: Date) => new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()))
const shift = (value: Date, offset: number) => new Date(value.getTime() + offset * 86_400_000)
const count = (blocks: Block[], accepted: string[]) => roundHours(blocks.reduce((total, block) => total + accepted.reduce((sum, name) => sum + categoryHours(block, name), 0), 0))
const change = (current: number, previous: number) => previous === 0 ? null : Number((((current - previous) / previous) * 100).toFixed(1))
const expectedCategory = (task: string) => {
  const value = task.toLowerCase()
  if (value.includes('sleep')) return 'Sleep'
  if (value.includes('walk') || value.includes('running') || value.includes('gym')) return 'Health'
  if (value.includes('house chores')) return 'House'
  if (value.includes('work')) return 'Work'
  if (value.includes('fun') || value.includes('break')) return 'Fun'
  if (value.includes('breakfast') || value.includes('lunch') || value.includes('dinner') || value.includes('bath')) return 'Personal'
  return 'Study'
}

export async function getPeriodAnalytics(days: number, endDate = new Date()) {
  const profile = await getLocalProfile()
  const end = day(endDate)
  const currentStart = shift(end, -(days - 1))
  const previousStart = shift(currentStart, -days)
  const logs = await prisma.dailyLog.findMany({
    where: { userId: profile.id, date: { gte: previousStart, lte: end } },
    include: { hourlyBlocks: { include: { category: true } } },
  })
  const current = logs.filter((log) => log.date >= currentStart).flatMap((log) => log.hourlyBlocks) as Block[]
  const previous = logs.filter((log) => log.date >= previousStart && log.date < currentStart).flatMap((log) => log.hourlyBlocks) as Block[]
  const filled = current.filter((block) => block.category)
  const totalSlots = days * 24

  const categories = groups.map((name) => {
    const hours = count(current, [name])
    const previousHours = count(previous, [name])
    return { name, hours, percentage: Number(((hours / totalSlots) * 100).toFixed(1)), previousHours, changePercentage: change(hours, previousHours) }
  })
  const hourly = Array.from({ length: 24 }, (_, hourIndex) => {
    const blocks = current.filter((block) => block.hourIndex === hourIndex)
    return { hour: `${hourIndex}:00`, focus: count(blocks, ['Study', 'Work']), distractions: roundHours(blocks.reduce((sum, block) => sum + distractionHours(block), 0)) }
  })
  const planned = current.filter((block) => !isOptionalPlan(block.plannedTask))
  const completed = planned.filter(isPlanComplete)
  const distractionCounts = Object.values(DistractionType).filter((type) => type !== DistractionType.NONE).map((type) => ({ name: type.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase()), count: roundHours(current.filter((block) => block.distraction === type && isDistraction(block)).reduce((sum, block) => sum + distractionHours(block), 0)) })).filter((item) => item.count > 0)
  const studyBreakdown = ['Study', 'Work', 'Sleep', 'House', 'Health', 'Personal', 'Fun', 'Other'].map((name) => ({ name, hours: count(current, [name]) })).filter((item) => item.hours > 0)
  const otherActivities = current.filter((block) => block.category?.name === 'Other' && block.activity?.trim()).reduce<Record<string, number>>((result, block) => {
    const activity = block.activity!.trim()
    result[activity] = (result[activity] ?? 0) + categoryHours(block, 'Other')
    return result
  }, {})
  const phoneDistractions = roundHours(current.filter((block) => block.distraction === DistractionType.PHONE).reduce((sum, block) => sum + distractionHours(block), 0))

  return { days, loggedHours: filled.length, totalSlots, categories, hourly, planned: { total: planned.length, completed: completed.length, diverted: planned.length - completed.length, completionPercentage: planned.length ? Number(((completed.length / planned.length) * 100).toFixed(1)) : null }, distractions: distractionCounts, phoneDistractions, studyBreakdown, otherActivities: Object.entries(otherActivities).map(([name, hours]) => ({ name, hours })) }
}
