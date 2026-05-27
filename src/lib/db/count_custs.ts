import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const count = await prisma.customer.count()
  console.log('Customer count:', count)
}

main().catch(console.error).finally(() => prisma.$disconnect())
