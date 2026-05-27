import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const employees = await prisma.employee.findMany({
    include: { customer: true },
  });

  console.log("ALL EMPLOYEES IN DATABASE:");
  employees.forEach(e => {
    console.log(`- ID: ${e.id}, Name: ${e.firstName} ${e.lastName}, Customer: ${e.customer?.name} (ID: ${e.customerId}), Status: ${e.isActive}`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
