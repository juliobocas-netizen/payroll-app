import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const employees = await prisma.employee.findMany({
    where: { isActive: false },
    include: { customer: true },
  });

  console.log(`Found ${employees.length} inactive employees:`);
  employees.forEach(e => {
    console.log(`- ${e.firstName} ${e.lastName} (Customer: ${e.customer?.name || "None"})`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
