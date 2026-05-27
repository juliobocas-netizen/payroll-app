import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const employees = await prisma.employee.findMany({
    where: { customerId: 4 },
  });

  console.log(`Employees for Bastimentos (ID 4): ${employees.length}`);
  employees.forEach(e => console.log(`- ${e.firstName} ${e.lastName}`));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
