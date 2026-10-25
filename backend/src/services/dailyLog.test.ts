import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import { DistractionType } from '../generated/prisma/client.js'
import { prisma } from '../lib/prisma.js'
import { getOrCreateDailyLog, updateHourlyBlock } from './dailyLog.js'

after(async () => {
  await prisma.$disconnect()
})

test('creates 24 fixed blocks and updates only the selected block', async () => {
  const user = await prisma.user.create({ data: { email: `phase2-${crypto.randomUUID()}@timelens.local`, categories: { create: { name: 'DSA', group: 'STUDY' } } } })

  try {
    const category = await prisma.category.findUniqueOrThrow({ where: { userId_name: { userId: user.id, name: 'DSA' } } })
    const log = await getOrCreateDailyLog(user.id, new Date('2026-09-25T00:00:00.000Z'))
    assert.equal(log.hourlyBlocks.length, 24)
    assert.deepEqual(log.hourlyBlocks.map((block) => block.hourIndex), Array.from({ length: 24 }, (_, index) => index))

    const updated = await updateHourlyBlock(log.id, 7, {
      categoryId: category.id,
      activity: 'LeetCode',
      plannedTask: 'DSA practice',
      distraction: DistractionType.NONE,
    })
    assert.equal(updated.hourIndex, 7)
    assert.equal(updated.activity, 'LeetCode')
    assert.equal(updated.category?.name, 'DSA')

    const untouched = await prisma.hourlyBlock.findUniqueOrThrow({
      where: { dailyLogId_hourIndex: { dailyLogId: log.id, hourIndex: 8 } },
    })
    assert.equal(untouched.activity, null)
  } finally {
    await prisma.user.delete({ where: { id: user.id } })
  }
})
