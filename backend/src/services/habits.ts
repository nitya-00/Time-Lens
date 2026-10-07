import { getLocalProfile } from '../lib/localProfile.js'
import { prisma } from '../lib/prisma.js'
import { categoryHours, isDistraction, type LoggedBlock } from './timeRules.js'

const day = (value: Date) => new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()))
const shift = (value: Date, offset: number) => new Date(value.getTime() + offset * 86_400_000)
type HabitValue = boolean | null
type DayResult = { date: string; phoneBeforeSleep: HabitValue; phoneAfterWaking: HabitValue; productiveDay: HabitValue }
type LogWithBlocks = { date: Date; hourlyBlocks: LoggedBlock[] }

function hasPhoneOrDistraction(block: LoggedBlock | undefined) {
  return !!block && (isDistraction(block) || ['phone', 'youtube'].includes(block.activity?.trim().toLowerCase() ?? ''))
}

function isEntered(blocks: LoggedBlock[]) { return blocks.some(block => !!block.category || !!block.activity?.trim() || isDistraction(block)) }

/** Select the first sleep run on this calendar day; contiguous blocks naturally include midnight neighbours. */
function evaluateDay(log: LogWithBlocks): DayResult {
  const blocks = log.hourlyBlocks
  const date = log.date.toISOString().slice(0, 10)
  if (!isEntered(blocks)) return { date, phoneBeforeSleep: null, phoneAfterWaking: null, productiveDay: null }

  const sleepHours = blocks.reduce((sum, block) => sum + categoryHours(block, 'Sleep'), 0)
  const focusHours = blocks.reduce((sum, block) => sum + categoryHours(block, 'Study') + categoryHours(block, 'Work'), 0)
  const healthHours = blocks.reduce((sum, block) => sum + categoryHours(block, 'Health'), 0)
  const funHours = blocks.reduce((sum, block) => sum + categoryHours(block, 'Fun'), 0)
  const firstSleep = blocks.findIndex(block => block.category?.name === 'Sleep')
  if (firstSleep < 0) return { date, phoneBeforeSleep: null, phoneAfterWaking: null, productiveDay: focusHours > 4 && sleepHours > 3 && healthHours > .5 && funHours > 1.5 }
  let sleepEnd = firstSleep
  while (sleepEnd < 23 && blocks[sleepEnd + 1]?.category?.name === 'Sleep') sleepEnd++
  // Each row represents exactly one hour. The adjacent rows are precisely the requested one-hour windows.
  const beforeSleep = firstSleep > 0 ? blocks[firstSleep - 1] : undefined
  const afterWaking = sleepEnd < 23 ? blocks[sleepEnd + 1] : undefined
  return {
    date,
    phoneBeforeSleep: beforeSleep ? !hasPhoneOrDistraction(beforeSleep) : null,
    phoneAfterWaking: afterWaking ? !hasPhoneOrDistraction(afterWaking) : null,
    productiveDay: focusHours > 4 && sleepHours > 3 && healthHours > .5 && funHours > 1.5,
  }
}

export async function getHabitAnalytics(days = 30, endDate = new Date()) {
  const profile = await getLocalProfile(); const end = day(endDate); const start = shift(end, -(days - 1))
  const logs = await prisma.dailyLog.findMany({ where: { userId: profile.id, date: { gte: start, lte: end } }, include: { hourlyBlocks: { include: { category: true }, orderBy: { hourIndex: 'asc' } } }, orderBy: { date: 'asc' } })
  const results = (logs as LogWithBlocks[]).map(evaluateDay)
  const keys: Array<keyof Omit<DayResult, 'date'>> = ['phoneBeforeSleep', 'phoneAfterWaking', 'productiveDay']
  const streak = (key: typeof keys[number]) => { let total = 0; for (const result of [...results].reverse()) { if (result[key] === null) continue; if (result[key] !== true) break; total++ } return total }
  const summary = (key: typeof keys[number]) => [7, 15, 30].map(period => { const window = results.slice(-period); return { days: period, completed: window.filter(item => item[key] === true).length, tracked: window.filter(item => item[key] !== null).length } })
  const title: Record<typeof keys[number], string> = { phoneBeforeSleep: 'No phone before sleep', phoneAfterWaking: 'No phone after waking', productiveDay: 'Productive day' }
  return { days: results, habits: keys.map(key => ({ key, title: title[key], summary: summary(key), streak: streak(key) })) }
}
