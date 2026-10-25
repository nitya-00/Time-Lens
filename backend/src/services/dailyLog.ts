import { DistractionType, Prisma } from '../generated/prisma/client.js'
import { prisma } from '../lib/prisma.js'

const HOUR_BLOCK_COUNT = 24
const PRIVATE_SCHEDULE_EMAIL = 'nitya.upadhyay1221@gmail.com'
const SCHEDULE_START = '2026-09-29'
const SCHEDULE_END = '2026-10-13'

const privateSchedule: Array<{ category: string; task: string }> = [
  { category: 'Sleep', task: 'Sleep' }, { category: 'Sleep', task: 'Sleep' },
  { category: 'Sleep', task: 'Sleep' }, { category: 'Sleep', task: 'Sleep' },
  { category: 'Health', task: 'Fresh + walk' }, { category: 'Study', task: 'DSE + book' },
  { category: 'Fun', task: 'Book or something fun' }, { category: 'Personal', task: 'Breakfast + project' },
  { category: 'Study', task: 'Project' }, { category: 'House', task: 'House chores' },
  { category: 'Work', task: 'Work' }, { category: 'Work', task: 'Work' },
  { category: 'Study', task: 'DSA + a little work' }, { category: 'Study', task: 'DSA' },
  { category: 'Personal', task: 'Lunch' }, { category: 'Work', task: 'Work' },
  { category: 'Study', task: 'DSA' }, { category: 'Work', task: 'Work' },
  { category: 'Fun', task: 'Break + a little fun' }, { category: 'Health', task: 'Running (if going)' },
  { category: 'Personal', task: 'Dinner, fresh + bath' }, { category: 'House', task: 'A little fun + house chores' },
  { category: 'Study', task: 'Project' }, { category: 'Study', task: 'Project' },
]

function dateOnly(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

export async function getOrCreateDailyLog(userId: string, date: Date) {
  const normalizedDate = dateOnly(date)
  const existing = await prisma.dailyLog.findUnique({
    where: { userId_date: { userId, date: normalizedDate } },
    include: { hourlyBlocks: { include: { category: true }, orderBy: { hourIndex: 'asc' } } },
  })
  if (existing) return existing

  const dateKey = normalizedDate.toISOString().slice(0, 10)
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { email: true } })
  const hasPrivateSchedule = user.email?.toLowerCase() === PRIVATE_SCHEDULE_EMAIL && dateKey >= SCHEDULE_START && dateKey <= SCHEDULE_END
  const blocks = Array.from({ length: HOUR_BLOCK_COUNT }, (_, hourIndex) => ({
    hourIndex,
    plannedTask: hasPrivateSchedule ? privateSchedule[hourIndex]?.task ?? null : null,
  }))
  try {
    return await prisma.dailyLog.create({
      data: { userId, date: normalizedDate, hourlyBlocks: { create: blocks } },
      include: { hourlyBlocks: { include: { category: true }, orderBy: { hourIndex: 'asc' } } },
    })
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') throw error
    return prisma.dailyLog.findUniqueOrThrow({
      where: { userId_date: { userId, date: normalizedDate } },
      include: { hourlyBlocks: { include: { category: true }, orderBy: { hourIndex: 'asc' } } },
    })
  }
}

type HourlyBlockUpdate = {
  categoryId?: string | null
  activity?: string | null
  plannedTask?: string | null
  distraction?: DistractionType
  customDistraction?: string | null
  missedPlanReason?: string | null
}

export async function updateHourlyBlock(dailyLogId: string, hourIndex: number, values: HourlyBlockUpdate) {
  return prisma.hourlyBlock.update({
    where: { dailyLogId_hourIndex: { dailyLogId, hourIndex } },
    data: values,
    include: { category: true },
  })
}
