import { DistractionType, type HourlyBlock } from '../generated/prisma/client.js'

export const distractionTypes = new Set<DistractionType>([
  DistractionType.PHONE, DistractionType.YOUTUBE, DistractionType.FRIENDS, DistractionType.TIRED, DistractionType.PROCRASTINATION,
])
export type LoggedBlock = HourlyBlock & { category: { name: string } | null }

export function isDistraction(block: Pick<HourlyBlock, 'distraction'>) {
  return distractionTypes.has(block.distraction)
}

export function isOptionalPlan(value: string | null) {
  return !value?.trim() || value.trim().toLowerCase() === 'optional'
}

export function isPlanComplete(block: LoggedBlock) {
  if (isOptionalPlan(block.plannedTask)) return true
  return block.category?.name.toLowerCase() === block.plannedTask!.trim().toLowerCase()
}

/** A valid interruption costs 20 minutes unless the activity itself is the interruption for the whole hour. */
export function distractionHours(block: LoggedBlock) {
  if (!isDistraction(block)) return 0
  const activity = block.activity?.trim().toLowerCase()
  const wholeHour = !block.category || activity === block.distraction.toLowerCase() || activity === block.distraction.replace('_', ' ').toLowerCase()
  return wholeHour ? 1 : 1 / 3
}

export function categoryHours(block: LoggedBlock, category: string) {
  if (block.category?.name !== category) return 0
  return Math.max(0, 1 - distractionHours(block))
}

export function roundHours(value: number) {
  return Number(value.toFixed(1))
}
