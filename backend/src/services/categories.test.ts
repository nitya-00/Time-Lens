import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import { CategoryGroup } from '../generated/prisma/client.js'
import { prisma } from '../lib/prisma.js'
import { getUserCategories } from './categories.js'

const userIds: string[] = []

after(async () => {
  await prisma.user.deleteMany({ where: { id: { in: userIds } } })
  await prisma.$disconnect()
})

test('initializing personal categories reconnects matching legacy category links', async () => {
  const name = `Legacy test ${crypto.randomUUID()}`
  const user = await prisma.user.create({ data: { email: `${crypto.randomUUID()}@timelens.local`, displayName: 'Legacy Test' } })
  userIds.push(user.id)
  const legacy = await prisma.category.create({ data: { name, group: CategoryGroup.OTHER } })
  const personal = await prisma.category.create({ data: { userId: user.id, name, group: CategoryGroup.OTHER } })
  const log = await prisma.dailyLog.create({ data: { userId: user.id, date: new Date('2026-10-01T00:00:00.000Z') } })
  await prisma.hourlyBlock.create({ data: { dailyLogId: log.id, hourIndex: 0, categoryId: legacy.id } })

  await getUserCategories(user.id)
  const block = await prisma.hourlyBlock.findUniqueOrThrow({ where: { dailyLogId_hourIndex: { dailyLogId: log.id, hourIndex: 0 } } })
  assert.equal(block.categoryId, personal.id)

  await prisma.category.delete({ where: { id: legacy.id } })
})
