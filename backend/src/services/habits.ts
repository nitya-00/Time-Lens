import { getLocalProfile } from '../lib/localProfile.js'
import { prisma } from '../lib/prisma.js'
import { categoryHours, isDistraction, roundHours, type LoggedBlock } from './timeRules.js'

const day = (value: Date) => new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()))
const shift = (value: Date, offset: number) => new Date(value.getTime() + offset * 86_400_000)
type DayResult = { date: string; phoneBeforeSleep: boolean | null; phoneAfterWaking: boolean | null; productiveDay: boolean }

function fullDistraction(block: LoggedBlock | undefined) { return !!block && (isDistraction(block) || ['phone', 'youtube'].includes(block.activity?.trim().toLowerCase() ?? '')) }

export async function getHabitAnalytics(days = 30, endDate = new Date()) {
  const profile = await getLocalProfile(); const end = day(endDate); const start = shift(end, -(days - 1))
  const logs = await prisma.dailyLog.findMany({ where: { userId: profile.id, date: { gte: start, lte: end } }, include: { hourlyBlocks: { include: { category: true }, orderBy: { hourIndex: 'asc' } } }, orderBy: { date: 'asc' } })
  const results: DayResult[] = logs.map(log => {
    const blocks = log.hourlyBlocks as LoggedBlock[]
    const sleepHours = blocks.reduce((sum, block) => sum + categoryHours(block, 'Sleep'), 0)
    const focusedHours = blocks.reduce((sum, block) => sum + categoryHours(block, 'Study') + categoryHours(block, 'Work'), 0)
    const healthHours = blocks.reduce((sum, block) => sum + categoryHours(block, 'Health'), 0)
    const funHours = blocks.reduce((sum, block) => sum + categoryHours(block, 'Fun'), 0)
    const sleepStarts = blocks.filter(block => block.category?.name === 'Sleep' && (block.hourIndex === 0 || blocks[block.hourIndex - 1]?.category?.name !== 'Sleep'))
    const sleepStart = sleepStarts.find(block => block.hourIndex === 0) ?? sleepStarts[0]
    let sleepEnd = sleepStart?.hourIndex
    while (sleepEnd !== undefined && sleepEnd < 23 && blocks[sleepEnd + 1]?.category?.name === 'Sleep') sleepEnd++
    const sleepPeriod = sleepStart !== undefined && sleepEnd !== undefined ? blocks.slice(sleepStart.hourIndex, sleepEnd + 1) : []
    const waking = sleepEnd !== undefined && sleepEnd < 23 ? blocks[sleepEnd + 1] : undefined
    const phoneDuringSleep = sleepPeriod.some(fullDistraction)
    const beforeSleep = sleepStart && sleepStart.hourIndex > 0 ? blocks[sleepStart.hourIndex - 1] : undefined
    return { date: log.date.toISOString().slice(0, 10), phoneBeforeSleep: sleepStart ? !(phoneDuringSleep || fullDistraction(beforeSleep)) : null, phoneAfterWaking: sleepStart ? !(phoneDuringSleep || fullDistraction(waking)) : null, productiveDay: focusedHours > 4 && sleepHours > 3 && healthHours >= .5 && funHours > 1.5 }
  })
  const streak = (key: keyof Pick<DayResult, 'phoneBeforeSleep' | 'phoneAfterWaking' | 'productiveDay'>) => { let total = 0; for (const result of [...results].reverse()) { if (result[key] !== true) break; total++ } return total }
  const summary = (key: keyof Pick<DayResult, 'phoneBeforeSleep' | 'phoneAfterWaking' | 'productiveDay'>) => [7, 15, 30].map(period => ({ days: period, completed: results.slice(-period).filter(item => item[key] === true).length, tracked: results.slice(-period).filter(item => item[key] !== null).length }))
  return { days: results, habits: [{ key: 'phoneBeforeSleep', title: 'No phone before sleep', summary: summary('phoneBeforeSleep'), streak: streak('phoneBeforeSleep') }, { key: 'phoneAfterWaking', title: 'No phone after waking', summary: summary('phoneAfterWaking'), streak: streak('phoneAfterWaking') }, { key: 'productiveDay', title: 'Productive day', summary: summary('productiveDay'), streak: streak('productiveDay') }], totals: results.reduce((out, item) => ({ ...out, productive: out.productive + Number(item.productiveDay) }), { productive: 0 }) }
}
