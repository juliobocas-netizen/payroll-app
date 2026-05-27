const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const earnings = await prisma.payrollEarning.findMany({
    where: { payrollRunId: 10 },
    include: { employee: true }
  });
  console.log('--- Earnings for Run 10 ---');
  earnings.forEach(e => {
    console.log(`Emp: ${e.employee.lastName}, ${e.employee.firstName} | Code: ${e.earningCode} | Amount: ${e.totalAmount}`);
  });
  process.exit(0);
}

main();
