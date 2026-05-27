import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const bast = await prisma.customer.findFirst({ where: { name: "Bastimentos" } });
  if (!bast) return;

  const dept = await prisma.department.findFirst({ where: { customerId: bast.id } }) 
    || await prisma.department.create({ data: { name: "Operations", customerId: bast.id } });
  
  const pos = await prisma.position.findFirst({ where: { customerId: bast.id } })
    || await prisma.position.create({ data: { title: "Clerk", customerId: bast.id } });

  await prisma.employee.create({
    data: {
      firstName: "Bast",
      lastName: "Employee 1",
      employeeCode: "B-001",
      hireDate: new Date(),
      isActive: true,
      customerId: bast.id,
      departmentId: dept.id,
      positionId: pos.id,
      paymentType: "quincenal",
      salaryType: "fijo",
      baseSalary: 1000,
    }
  });

  await prisma.employee.create({
    data: {
      firstName: "Bast",
      lastName: "Employee 2",
      employeeCode: "B-002",
      hireDate: new Date(),
      isActive: true,
      customerId: bast.id,
      departmentId: dept.id,
      positionId: pos.id,
      paymentType: "quincenal",
      salaryType: "fijo",
      baseSalary: 1200,
    }
  });

  console.log("Created 2 employees for Bastimentos.");
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
