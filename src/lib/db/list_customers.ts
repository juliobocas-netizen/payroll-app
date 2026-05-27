import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const customers = await prisma.customer.findMany();
  console.log("Customers:");
  customers.forEach(c => console.log(`- ${c.name} (ID: ${c.id})`));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
