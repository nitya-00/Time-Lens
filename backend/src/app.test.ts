import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import request from 'supertest'
import app from './app.js'
import { prisma } from './lib/prisma.js'
const agent = request.agent(app)
let testUserId = ''

before(async () => {
  const email = `test-${crypto.randomUUID()}@timelens.local`
  const response = await agent.post('/api/auth/register').send({ email, password: 'password-123', displayName: 'Test User' })
  assert.equal(response.status, 200)
  // The production cookie is Secure; explicitly retain it for Supertest's HTTP-only in-memory server.
  agent.set('Cookie', response.headers['set-cookie'])
  testUserId = (await prisma.user.findUniqueOrThrow({ where: { email } })).id
})

after(async () => {
  if (testUserId) await prisma.user.delete({ where: { id: testUserId } })
  await prisma.$disconnect()
})

test('GET /api/health returns ok', async () => {
  const response = await request(app).get('/api/health')

  assert.equal(response.status, 200)
  assert.equal(response.body.status, 'ok')
  assert.equal(response.body.frontendOrigin, process.env.FRONTEND_ORIGIN)
})

test('daily-log endpoint returns 24 blocks and updates one selected block', async () => {
  const date = '2026-09-24'

  try {
    const categories = await agent.get('/api/categories')
    const study = categories.body.categories.find((category: { name: string }) => category.name === 'Study')
    const log = await agent.get(`/api/daily-log/${date}`)
    assert.equal(log.status, 200)
    assert.equal(log.body.blocks.length, 24)

    const update = await agent
      .patch(`/api/daily-log/${date}/blocks/7`)
      .send({ categoryId: study.id, activity: 'LeetCode', plannedTask: 'Study practice', distraction: 'NONE' })
    assert.equal(update.status, 200)
    assert.equal(update.body.activity, 'LeetCode')

    const refreshed = await agent.get(`/api/daily-log/${date}`)
    assert.equal(refreshed.body.blocks[7].activity, 'LeetCode')
    assert.equal(refreshed.body.blocks[8].activity, null)
  } finally {
    await prisma.dailyLog.deleteMany({ where: { userId: testUserId, date: new Date(`${date}T00:00:00.000Z`) } })
  }
})

test('dashboard endpoint returns real summaries with cautious empty-data guidance', async () => {
  const date = '2099-01-01'

  try {
    const response = await agent.get(`/api/analytics/dashboard?date=${date}`)
    assert.equal(response.status, 200)
    assert.equal(response.body.cards.length, 8)
    assert.deepEqual(response.body.cards.map((card: { name: string }) => card.name), ['Study', 'Work', 'Sleep', 'House', 'Health', 'Personal', 'Other', 'Fun'])
    assert.equal(response.body.studyBreakdown.length, 0)
    assert.match(response.body.insight, /Not enough data yet/)
    assert.deepEqual(response.body.challenge, { completedDays: 0, targetDays: 100, percentage: 0 })
  } finally {
    await prisma.dailyLog.deleteMany({ where: { userId: testUserId, date: new Date(`${date}T00:00:00.000Z`) } })
  }
})

test('period analytics endpoint returns comparison and pattern structures', async () => {
  const response = await agent.get('/api/analytics/7')
  assert.equal(response.status, 200)
  assert.equal(response.body.days, 7)
  assert.equal(response.body.categories.length, 8)
  assert.equal(response.body.hourly.length, 24)
  assert.deepEqual(Object.keys(response.body.planned), ['total', 'completed', 'diverted', 'completionPercentage'])
})

test('goals endpoint creates and updates a simple goal', async () => {
  let goalId: string | undefined
  try {
    const created = await agent.post('/api/goals').send({ title: 'Finish API module', dueDate: '2099-01-02' })
    assert.equal(created.status, 201)
    goalId = created.body.id
    const updated = await agent.put(`/api/goals/${goalId}`).send({ progress: 40 })
    assert.equal(updated.status, 200)
    assert.equal(updated.body.progress, 40)
    const deleted = await agent.delete(`/api/goals/${goalId}`)
    assert.equal(deleted.status, 204)
    goalId = undefined
  } finally { if (goalId) await prisma.goal.delete({ where: { id: goalId } }) }
})

test('challenge accepts more than one activity on the same day', async () => {
  const first = await agent.post('/api/challenge/today').send({ description: 'Learned a new shortcut', category: 'SKILL' })
  assert.equal(first.status, 201)
  const second = await agent.post('/api/challenge/today').send({ description: 'Took a new running route', category: 'HEALTH' })
  assert.equal(second.status, 201)
  assert.equal(second.body.entries.filter((entry: { dayNumber: number }) => entry.dayNumber === second.body.dayNumber).length, 2)
})
