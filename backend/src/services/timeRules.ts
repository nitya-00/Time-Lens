import { DistractionType, type HourlyBlock } from '../generated/prisma/client.js'

export const distractionTypes = new Set<DistractionType>(Object.values(DistractionType).filter(type => type !== DistractionType.NONE))
export type LoggedBlock = HourlyBlock & { category: { name: string } | null }

export function isDistraction(block: Pick<HourlyBlock, 'distraction' | 'customDistraction'>) {
  return distractionTypes.has(block.distraction)
}

export function isPhoneUse(block: Pick<HourlyBlock, 'distraction' | 'customDistraction' | 'activity'> & { category?: { name: string } | null }) {
  const values = [block.activity, block.customDistraction, block.category?.name, block.distraction.replaceAll('_', ' ')].filter(Boolean).map(value => value!.trim().toLowerCase())
  return values.some(value => value === 'phone' || value === 'youtube')
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
  const label = block.customDistraction ?? block.distraction.replace('_', ' ')
  const wholeHour = !block.category || activity === block.distraction.toLowerCase() || activity === label.toLowerCase()
  return wholeHour ? 1 : 1 / 3
}

export function categoryHours(block: LoggedBlock, category: string) {
  if (block.category?.name !== category) return 0
  return Math.max(0, 1 - distractionHours(block))
}

export function roundHours(value: number) {
  return Number(value.toFixed(1))
}
