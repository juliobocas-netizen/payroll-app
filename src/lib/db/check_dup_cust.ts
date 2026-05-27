import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const customers = await prisma.customer.findMany({
    where: { name: { contains: "Bastimentos" } },
  });

  console.log(`Found ${customers.length} customers matching 'Bastimentos':`);
  customers.forEach(c => console.log(`- ID: ${c.id}, Name: ${c.name}`));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
