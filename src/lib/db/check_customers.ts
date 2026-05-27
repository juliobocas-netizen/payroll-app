import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const customers = await prisma.customer.findMany()
  console.log('Customers in DB:', customers.map(c => ({ id: c.id, name: c.name })))
}

main().catch(console.error).finally(() => prisma.$disconnect())
