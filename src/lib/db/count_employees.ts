import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const counts = await prisma.employee.groupBy({
    by: ["customerId"],
    _count: { id: true },
  });

  const customers = await prisma.customer.findMany();
  const customerMap = Object.fromEntries(customers.map(c => [c.id, c.name]));

  console.log("Employee counts by customer:");
  counts.forEach(c => {
    console.log(`- ${customerMap[c.customerId || 0] || "Unknown"}: ${c._count.id}`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
