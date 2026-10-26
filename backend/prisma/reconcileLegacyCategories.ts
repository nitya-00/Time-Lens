import { prisma } from '../src/lib/prisma.js'
import { reconcileLegacyCategoryLinks } from '../src/services/categories.js'

const users = await prisma.user.findMany({ where: { categoriesInitialized: true }, select: { id: true } })
for (const user of users) await reconcileLegacyCategoryLinks(user.id)
console.info(`Reconciled legacy category links for ${users.length} user(s).`)
await prisma.$disconnect()
