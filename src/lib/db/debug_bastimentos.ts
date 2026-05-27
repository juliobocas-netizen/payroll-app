import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const customer = await prisma.customer.findFirst({
    where: { name: { contains: "Bastimentos" } },
  });

  if (!customer) {
    console.log("Customer Bastimentos not found");
    return;
  }

  console.log(`Customer: ${customer.name} (ID: ${customer.id})`);

  const employees = await prisma.employee.findMany({
    where: { customerId: customer.id },
  });

  console.log(`Found ${employees.length} employees:`);
  employees.forEach(e => {
    console.log(`- ${e.firstName} ${e.lastName} (Code: ${e.employeeCode}, Active: ${e.isActive})`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
