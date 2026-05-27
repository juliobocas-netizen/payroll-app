import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const bast = await prisma.customer.findFirst({ where: { name: "Bastimentos" } });
  if (!bast) return;

  await prisma.employee.upsert({
    where: { customerId_employeeCode: { customerId: bast.id, employeeCode: "BAST-001" } },
    update: { isActive: true },
    create: {
      firstName: "Bast",
      lastName: "Employee 1",
      employeeCode: "BAST-001",
      customerId: bast.id,
      baseSalary: 1000,
      isActive: true,
    }
  });

  await prisma.employee.upsert({
    where: { customerId_employeeCode: { customerId: bast.id, employeeCode: "BAST-002" } },
    update: { isActive: true },
    create: {
      firstName: "Bast",
      lastName: "Employee 2",
      employeeCode: "BAST-002",
      customerId: bast.id,
      baseSalary: 1200,
      isActive: true,
    }
  });

  console.log("Upserted 2 employees for Bastimentos.");
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
