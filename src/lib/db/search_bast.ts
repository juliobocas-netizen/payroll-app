import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const employees = await prisma.employee.findMany({
    where: {
      OR: [
        { firstName: { contains: "bast" } },
        { lastName: { contains: "bast" } },
      ]
    },
    include: { customer: true },
  });

  console.log(`Found ${employees.length} employees matching 'bast':`);
  employees.forEach(e => {
    console.log(`- ID: ${e.id}, Name: ${e.firstName} ${e.lastName}, Customer: ${e.customer?.name} (ID: ${e.customerId})`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
