import { Router } from 'express'
import { z } from 'zod'
import { getLocalProfile } from '../lib/localProfile.js'
import { prisma } from '../lib/prisma.js'

const router = Router()
const goalSchema = z.object({ title: z.string().trim().min(1).max(160), dueDate: z.string().date().nullable().optional(), progress: z.number().int().min(0).max(366).optional(), targetValue: z.string().trim().max(12).nullable().optional() })

router.get('/goals', async (_request, response, next) => {
  try { const profile = await getLocalProfile(); const goals = await prisma.goal.findMany({ where: { userId: profile.id }, orderBy: [{ isActive: 'desc' }, { dueDate: 'asc' }] }); response.json({ goals: goals.map(({ id, title, dueDate, progress, targetValue, isActive, createdAt }) => ({ id, title, dueDate: dueDate?.toISOString().slice(0, 10) ?? null, progress, targetValue, isActive, createdAt: createdAt.toISOString().slice(0, 10) })) }) } catch (error) { next(error) }
})

router.post('/goals', async (request, response, next) => {
  try { const parsed = goalSchema.safeParse(request.body); if (!parsed.success) return response.status(400).json({ message: 'Please enter a goal title and valid progress.' }); const profile = await getLocalProfile(); const goal = await prisma.goal.create({ data: { userId: profile.id, title: parsed.data.title, dueDate: parsed.data.dueDate ? new Date(`${parsed.data.dueDate}T00:00:00.000Z`) : null, progress: parsed.data.progress ?? 0, targetValue: parsed.data.targetValue ?? '30' } }); response.status(201).json({ id: goal.id, title: goal.title, dueDate: goal.dueDate?.toISOString().slice(0, 10) ?? null, progress: goal.progress, targetValue: goal.targetValue, isActive: goal.isActive, createdAt: goal.createdAt.toISOString().slice(0, 10) }) } catch (error) { next(error) }
})

router.put('/goals/:id', async (request, response, next) => {
  try { const parsed = goalSchema.partial().extend({ isActive: z.boolean().optional() }).safeParse(request.body); if (!parsed.success) return response.status(400).json({ message: 'Please check the goal values.' }); const profile = await getLocalProfile(); await prisma.goal.findFirstOrThrow({ where: { id: request.params.id, userId: profile.id } }); const goal = await prisma.goal.update({ where: { id: request.params.id }, data: { ...parsed.data, dueDate: parsed.data.dueDate === undefined ? undefined : parsed.data.dueDate ? new Date(`${parsed.data.dueDate}T00:00:00.000Z`) : null } }); response.json({ id: goal.id, title: goal.title, dueDate: goal.dueDate?.toISOString().slice(0, 10) ?? null, progress: goal.progress, targetValue: goal.targetValue, isActive: goal.isActive, createdAt: goal.createdAt.toISOString().slice(0, 10) }) } catch (error) { next(error) }
})
router.delete('/goals/:id', async (request, response, next) => {
  try { const profile = await getLocalProfile(); const result = await prisma.goal.deleteMany({ where: { id: request.params.id, userId: profile.id } }); if (!result.count) return response.status(404).json({ message: 'Goal not found.' }); response.status(204).send() } catch (error) { next(error) }
})
export default router
