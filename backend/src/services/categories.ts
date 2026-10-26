import { type CategoryGroup } from '../generated/prisma/client.js'
import { prisma } from '../lib/prisma.js'

export const defaultCategories: Array<{ name: string; group: CategoryGroup }> = [
  { name: 'Study', group: 'STUDY' }, { name: 'Work', group: 'WORK' },
  { name: 'Sleep', group: 'SLEEP' }, { name: 'House', group: 'LIFE' },
  { name: 'Health', group: 'HEALTH' }, { name: 'Personal', group: 'LIFE' },
  { name: 'Other', group: 'OTHER' }, { name: 'Fun', group: 'LEISURE' },
]

export const defaultDistractionOptions = ['Phone', 'YouTube', 'Friends', 'Unexpected work', 'Tired', 'Procrastination']

export async function reconcileLegacyCategoryLinks(userId: string) {
  const categories = await prisma.category.findMany({ where: { userId, isActive: true }, select: { id: true, name: true } })
  for (const category of categories) {
    await prisma.hourlyBlock.updateMany({
      where: { dailyLog: { userId }, category: { userId: null, name: category.name } },
      data: { categoryId: category.id },
    })
  }
}

export async function getUserCategories(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { categoriesInitialized: true } })
  if (!user.categoriesInitialized) {
    await prisma.$transaction([
      ...defaultCategories.map((category) => prisma.category.upsert({
        where: { userId_name: { userId, name: category.name } },
        update: { group: category.group, isActive: true },
        create: { userId, ...category },
      })),
      prisma.user.update({ where: { id: userId }, data: { categoriesInitialized: true } }),
    ])
    await reconcileLegacyCategoryLinks(userId)
  }
  return prisma.category.findMany({ where: { userId, isActive: true }, orderBy: { createdAt: 'asc' } })
}

export function readDistractionOptions(value: unknown) {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
    ? value as string[]
    : defaultDistractionOptions
}
