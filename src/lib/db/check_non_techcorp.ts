import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const employees = await prisma.employee.findMany({
    where: { NOT: { customerId: 1 } },
    include: { customer: true },
  });

  console.log(`Found ${employees.length} employees NOT in Tech Corp:`);
  employees.forEach(e => {
    console.log(`- ID: ${e.id}, Name: ${e.firstName} ${e.lastName}, Customer: ${e.customer?.name} (ID: ${e.customerId})`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
