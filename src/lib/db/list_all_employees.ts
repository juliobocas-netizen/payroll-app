import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const employees = await prisma.employee.findMany({
    include: { customer: true },
  });

  console.log(`Found ${employees.length} employees in total:`);
  employees.forEach(e => {
    console.log(`- ${e.firstName} ${e.lastName} (Code: ${e.employeeCode}, Customer: ${e.customer?.name || "None"})`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
