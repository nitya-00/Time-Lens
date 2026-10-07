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
function evaluateDay(log: LogWithBlocks, previous: LogWithBlocks | undefined): DayResult {
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
  const beforeSleep = firstSleep > 0 ? blocks[firstSleep - 1] : previous?.hourlyBlocks[23]
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
  const logs = await prisma.dailyLog.findMany({ where: { userId: profile.id, date: { gte: shift(start, -1), lte: end } }, include: { hourlyBlocks: { include: { category: true }, orderBy: { hourIndex: 'asc' } } }, orderBy: { date: 'asc' } }) as LogWithBlocks[]
  const automatic = logs.filter(log => log.date >= start).map((log, index, included) => evaluateDay(log, logs[logs.indexOf(log) - 1] ?? included[index - 1]))
  const overrides = await prisma.habitOverride.findMany({ where: { userId: profile.id, date: { gte: start, lte: end } } })
  const results = automatic.map(item => overrides.filter(override => override.date.toISOString().slice(0, 10) === item.date).reduce((next, override) => ({ ...next, [override.habit]: override.completed }), item)) as DayResult[]
  const keys: Array<keyof Omit<DayResult, 'date'>> = ['phoneBeforeSleep', 'phoneAfterWaking', 'productiveDay']
  const streak = (key: typeof keys[number]) => { let total = 0; for (const result of [...results].reverse()) { if (result[key] === null) continue; if (result[key] !== true) break; total++ } return total }
  const best = (key: typeof keys[number]) => { let best = 0; let run = 0; for (const result of results) { if (result[key] === true) { run++; best = Math.max(best, run) } else if (result[key] === false) run = 0 } return best }
  const summary = (key: typeof keys[number]) => [7, 15, 30].map(period => { const window = results.slice(-period); return { days: period, completed: window.filter(item => item[key] === true).length, tracked: window.filter(item => item[key] !== null).length } })
  const title: Record<typeof keys[number], string> = { phoneBeforeSleep: 'No phone before sleep', phoneAfterWaking: 'No phone after waking', productiveDay: 'Productive day' }
  const habits = keys.map(key => { const measured = results.filter(day => day[key] !== null); const completed = measured.filter(day => day[key] === true).length; return { key, title: title[key], summary: summary(key), streak: streak(key), bestStreak: best(key), completed, breaks: measured.length - completed, notMeasurable: results.length - measured.length, completionRate: measured.length ? Math.round(completed / measured.length * 100) : 0 } })
  return { days: results, habits }
}
