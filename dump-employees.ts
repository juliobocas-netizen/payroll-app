import { PrismaClient } from "@prisma/client";

async function main() {
  const p = new PrismaClient();
  const employees = await p.employee.findMany({
    orderBy: { id: "asc" },
    include: { department: true, position: true, bank: true },
  });

  console.log(
    [
      "ID",
      "Code",
      "First Name",
      "Last Name",
      "Cedula",
      "SSS",
      "Department",
      "Position",
      "Salary",
      "Payment",
      "Bank",
      "OT Eligible",
      "Rest Day",
      "Hire Date",
      "Active",
    ].join(" | ")
  );
  console.log("-".repeat(180));

  for (const e of employees) {
    console.log(
      [
        e.id,
        e.employeeCode,
        e.firstName,
        e.lastName,
        e.identificationNumber,
        e.sssNumber,
        e.department?.name ?? "-",
        e.position?.title ?? "-",
        `$${e.baseSalary.toFixed(2)}`,
        e.paymentMethod,
        e.bank?.bankName ?? "-",
        e.isOvertimeEligible ? "Yes" : "No",
        e.restDay,
        e.hireDate?.toISOString().split("T")[0] ?? "-",
        e.isActive ? "Yes" : "No",
      ].join(" | ")
    );
  }

  console.log(`\nTotal: ${employees.length} employees`);
  await p.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
