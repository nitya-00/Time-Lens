import { CategoryGroup, PrismaClient } from '../src/generated/prisma/client.js'
import { PrismaPg } from '@prisma/adapter-pg'
import { config } from 'dotenv'

config({ path: new URL('../.env', import.meta.url) })

const connectionString = process.env.DATABASE_URL

if (!connectionString) throw new Error('DATABASE_URL is required to seed categories.')

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) })

const categories: Array<[string, CategoryGroup]> = [
  ['DSA', 'STUDY'], ['ML', 'STUDY'], ['Project', 'STUDY'], ['College', 'STUDY'],
  ['Work', 'WORK'], ['Phone', 'PHONE'], ['YouTube', 'PHONE'], ['Friends', 'LIFE'],
  ['Sleep', 'SLEEP'], ['Gym', 'HEALTH'], ['Health', 'HEALTH'], ['Food', 'LIFE'],
  ['Travel', 'LIFE'], ['Household', 'LIFE'], ['Entertainment', 'LEISURE'], ['Other', 'OTHER'],
]

async function seed() {
  for (const [name, group] of categories) {
    const existing = await prisma.category.findFirst({ where: { name, userId: null } })
    if (existing) await prisma.category.update({ where: { id: existing.id }, data: { group } })
    else await prisma.category.create({ data: { name, group } })
  }
}

seed().then(() => prisma.$disconnect()).catch(async (error: unknown) => {
  console.error(error)
  await prisma.$disconnect()
  process.exitCode = 1
})
