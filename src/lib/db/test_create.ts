import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  try {
    const calendar = await prisma.payCalendar.create({
      data: {
        customerId: 1,
        frequency: 'monthly',
        payFrom: new Date('2026-05-01'),
        payTo: new Date('2026-05-31'),
        paymentDate: new Date('2026-05-31'),
        periodLabel: 'Test Period'
      }
    })
    console.log('Successfully created calendar:', calendar)
  } catch (error) {
    console.error('Failed to create calendar from script:', error)
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
