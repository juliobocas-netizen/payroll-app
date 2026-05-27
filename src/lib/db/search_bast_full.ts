import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// @ts-nocheck
async function main() {
  const customers = await prisma.customer.findMany({
    where: { name: { contains: "Bast", mode: 'insensitive' } },
  });

  console.log(`Found ${customers.length} customers matching 'Bast':`);
  for (const c of customers) {
    const count = await prisma.employee.count({ where: { customerId: c.id } });
    console.log(`- ID: ${c.id}, Name: '${c.name}', Employee Count: ${count}`);
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
