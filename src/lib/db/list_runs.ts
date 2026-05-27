import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const runs = await prisma.payrollRun.findMany({
    include: { customer: true },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  console.log("Recent Payroll Runs:");
  runs.forEach(r => {
    console.log(`- ID: ${r.id}, Customer: ${r.customer.name}, Status: ${r.status}, Dates: ${r.payFrom.toLocaleDateString()} - ${r.payTo.toLocaleDateString()}`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
