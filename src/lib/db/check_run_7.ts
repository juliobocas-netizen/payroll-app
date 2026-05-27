import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const run = await prisma.payrollRun.findUnique({
    where: { id: 7 },
    include: { customer: true },
  });

  if (!run) {
    console.log("Run 7 not found");
    return;
  }

  console.log(`Run ID: ${run.id}`);
  console.log(`Customer Name: ${run.customer.name}`);
  console.log(`Customer ID: ${run.customerId}`);

  const employees = await prisma.employee.findMany({
    where: { customerId: run.customerId },
  });

  console.log(`Found ${employees.length} employees for this customer ID.`);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
