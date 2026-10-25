import { Router } from 'express'
import { z } from 'zod'
import { CheckInPeriod } from '../generated/prisma/client.js'
import { getLocalProfile } from '../lib/localProfile.js'
import { prisma } from '../lib/prisma.js'
import { todayInTimeZone } from '../lib/dates.js'
const router = Router(); const periods = Object.values(CheckInPeriod) as [CheckInPeriod, ...CheckInPeriod[]]
const schema=z.object({period:z.enum(periods),energy:z.number().int().min(1).max(5).nullable(),focus:z.number().int().min(1).max(5).nullable(),mood:z.number().int().min(1).max(5).nullable(),note:z.string().trim().max(500).nullable().optional()})
router.get('/checkins',async(_q,res,next)=>{try{const u=await getLocalProfile();const date=todayInTimeZone(u.timeZone);const items=await prisma.checkIn.findMany({where:{userId:u.id,date}});const averages=await prisma.checkIn.aggregate({where:{userId:u.id},_avg:{energy:true,focus:true,mood:true}});res.json({items,averages:{energy:averages._avg.energy?.toFixed(1)??null,focus:averages._avg.focus?.toFixed(1)??null,mood:averages._avg.mood?.toFixed(1)??null}})}catch(e){next(e)}})
router.post('/checkins',async(req,res,next)=>{try{const p=schema.safeParse(req.body);if(!p.success)return res.status(400).json({message:'Use ratings from 1 to 5, or leave a value blank.'});const u=await getLocalProfile();const date=todayInTimeZone(u.timeZone);const item=await prisma.checkIn.upsert({where:{userId_date_period:{userId:u.id,date,period:p.data.period}},update:p.data,create:{userId:u.id,date,...p.data}});res.json(item)}catch(e){next(e)}})
export default router
