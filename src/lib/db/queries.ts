import "server-only";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";

export interface SessionUser {
  id: number;
  username: string;
  email: string;
  fullName: string | null;
  roleId: number;
  roleName: string;
  roleLevel: number;
  customerId: number | null;
  lastCustomerId: number | null;
  languagePref: string;
  dateFormat: string;
  currencyDisplay: string;
  isActive: boolean;
}

export async function authenticateUser(username: string, password: string): Promise<SessionUser | null> {

  const user = await prisma.user.findUnique({
    where: { username },
    include: { role: true },
  });

  if (!user || !user.isActive) return null;

  const validPassword = await bcrypt.compare(password, user.passwordHash);
  if (!validPassword) return null;

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    fullName: user.fullName,
    roleId: user.roleId,
    roleName: user.role.name,
    roleLevel: user.role.level,
    customerId: user.customerId,
    lastCustomerId: user.lastCustomerId,
    languagePref: user.languagePref,
    dateFormat: user.dateFormat,
    currencyDisplay: user.currencyDisplay,
    isActive: user.isActive,
  };
}

export async function getCustomerById(id: number) {
  return prisma.customer.findUnique({ where: { id } });
}

export async function getAllCustomers() {
  return prisma.customer.findMany({
    orderBy: { name: "asc" },
  });
}

export async function getActiveCustomers() {
  return prisma.customer.findMany({
    where: { status: "activo" },
    orderBy: { name: "asc" },
  });
}

export async function getEmployees(customerId: number) {
  return prisma.employee.findMany({
    where: { 
      customerId,
      isActive: true
    },
    include: {
      department: true,
      position: true,
      bank: true,
    },
    orderBy: { firstName: "asc" },
  });
}

export async function getEmployeeHasTransactions(employeeId: number) {
  const [
    payrollInputs,
    payments,
    deductions,
    earnings,
    vacationAccruals,
    accruals13th,
    terminations,
  ] = await Promise.all([
    prisma.payrollInput.count({ where: { employeeId } }),
    prisma.paymentOutput.count({ where: { employeeId } }),
    prisma.payrollDeduction.count({ where: { employeeId } }),
    prisma.payrollEarning.count({ where: { employeeId } }),
    prisma.vacationAccrual.count({ where: { employeeId } }),
    prisma.accrual13thMonth.count({ where: { employeeId } }),
    prisma.termination.count({ where: { employeeId } }),
  ]);
  const total = payrollInputs + payments + deductions + earnings +
    vacationAccruals + accruals13th + terminations;
  return total > 0;
}

export async function getDepartments(customerId: number) {
  return prisma.department.findMany({
    where: { customerId, isActive: true },
    orderBy: { name: "asc" },
  });
}

export async function getPositions(customerId: number) {
  return prisma.position.findMany({
    where: { customerId, isActive: true },
    orderBy: { title: "asc" },
  });
}

export async function getBanks() {
  return prisma.bank.findMany({
    where: { isActive: true },
    orderBy: { bankName: "asc" },
  });
}

export async function getAllBanks() {
  return prisma.bank.findMany({
    orderBy: { bankName: "asc" },
  });
}

export async function getPayCalendars(customerId: number) {
  return prisma.payCalendar.findMany({
    where: { customerId, isActive: true },
    orderBy: { payFrom: "desc" },
  });
}

export async function getPayrollRuns(customerId: number) {
  return prisma.payrollRun.findMany({
    where: { customerId },
    include: {
      calendar: true,
      summaries: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getPayrollRunDetails(payrollRunId: number) {
  return prisma.payrollRun.findUnique({
    where: { id: payrollRunId },
    include: {
      calendar: true,
      earnings: {
        include: {
          employee: true,
        }
      },
      deductions: {
        include: {
          employee: true,
        }
      },
      summaries: true,
      calculatedByUser: true,
      approvedByUser: true,
      closedByUser: true,
    },
  });
}

export async function getPayrollRunWithData(payrollRunId: number) {
  const payrollRun = await prisma.payrollRun.findUnique({
    where: { id: payrollRunId },
    include: {
      calendar: true,
      calculatedByUser: true,
      approvedByUser: true,
      closedByUser: true,
      earnings: {
        include: {
          employee: true,
        },
        orderBy: { employeeId: 'asc' }
      },
      deductions: {
        include: {
          employee: true,
        },
        orderBy: { employeeId: 'asc' }
      },
    },
  });

  if (!payrollRun) return null;

  // Group earnings and deductions by employee
  const employeeData = new Map();

  // Process earnings
  payrollRun.earnings.forEach(earning => {
    const empId = earning.employeeId;
    if (!employeeData.has(empId)) {
      employeeData.set(empId, {
        id: empId,
        employeeCode: earning.employee.employeeCode,
        employeeName: `${earning.employee.firstName} ${earning.employee.lastName}`,
        grossPay: 0,
        css: 0,
        isr: 0,
        seguro: 0,
        otherDeductions: 0,
        totalDeductions: 0,
        thirteenthMonth: 0,
        netPay: 0,
        hasException: false,
      });
    }
    const emp = employeeData.get(empId);
    // All earnings contribute to grossPay (matching wizard calculation logic)
    emp.grossPay += earning.totalAmount;
  });

  // Process deductions (match wizard: CSS, SEGURO_EDUCATIVO, ISR, and other)
  payrollRun.deductions.forEach(deduction => {
    const empId = deduction.employeeId;
    if (!employeeData.has(empId)) {
      employeeData.set(empId, {
        id: empId,
        employeeCode: deduction.employee.employeeCode,
        employeeName: `${deduction.employee.firstName} ${deduction.employee.lastName}`,
        grossPay: 0,
        css: 0,
        isr: 0,
        seguro: 0,
        otherDeductions: 0,
        totalDeductions: 0,
        thirteenthMonth: 0,
        netPay: 0,
        hasException: false,
      });
    }
    const emp = employeeData.get(empId);
    if (deduction.deductionCode === 'CSS') {
      emp.css += deduction.amount;
    } else if (deduction.deductionCode === 'SEGURO_EDUCATIVO') {
      emp.seguro += deduction.amount;
    } else if (deduction.deductionCode === 'ISR') {
      emp.isr += deduction.amount;
    } else {
      emp.otherDeductions += deduction.amount;
    }
    emp.totalDeductions += deduction.amount;
  });

  // Calculate net pay for each employee (matching wizard: grossPay - totalDeductions)
  const payrollData = Array.from(employeeData.values()).map(emp => ({
    ...emp,
    thirteenthMonth: emp.grossPay / 12,
    netPay: emp.grossPay - emp.totalDeductions,
  }));

  return {
    ...payrollRun,
    payrollData,
  };
}

export async function getIsrBrackets() {
  return prisma.isrTaxBracket.findMany({
    orderBy: { bracketOrder: "asc" },
  });
}

export async function getOvertimeRules() {
  return prisma.overtimeRule.findMany({
    where: { isActive: true },
    orderBy: { effectiveFrom: "desc" },
  });
}

export async function getAllOvertimeRules() {
  return prisma.overtimeRule.findMany({
    orderBy: { effectiveFrom: "desc" },
  });
}

export async function getStatutoryDeductions() {
  return prisma.statutoryDeduction.findMany({
    where: { isActive: true },
    orderBy: { code: "asc" },
  });
}

export async function getAllStatutoryDeductions() {
  return prisma.statutoryDeduction.findMany({
    orderBy: { code: "asc" },
  });
}

export async function getHolidays() {
  return prisma.holiday.findMany({
    orderBy: { holidayDate: "asc" },
  });
}

export async function getIsrSettings() {
  return prisma.isrSetting.findMany({
    orderBy: { effectiveFrom: "desc" },
  });
}

export async function getVacationAccruals(customerId: number) {
  return prisma.vacationAccrual.findMany({
    where: {
      employee: { customerId },
    },
    include: {
      employee: {
        select: {
          id: true,
          employeeCode: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });
}

export async function getAuditLogs(customerId?: number, limit = 50) {
  const where = customerId ? { notes: { contains: `customer:${customerId}` } } : {};
  return prisma.auditLog.findMany({
    where,
    include: { user: { select: { username: true, fullName: true } } },
    orderBy: { changedAt: "desc" },
    take: limit,
  });
}

export async function getPayrollInputs(payrollRunId: number) {
  return prisma.payrollInput.findMany({
    where: { payrollRunId },
    include: { employee: true },
    orderBy: [{ employeeCode: "asc" }, { date: "asc" }],
  });
}

export async function getPayrollRunsByCustomer(customerId: number) {
  return prisma.payrollRun.findMany({
    where: { customerId },
    include: { calendar: true },
    orderBy: { createdAt: "desc" }
  });
}

export async function getPayrollRunDetailsByDateRange(customerId: number, payFrom: Date, payTo: Date) {
  const runs = await prisma.payrollRun.findMany({
    where: {
      customerId,
      payFrom: { gte: payFrom },
      payTo: { lte: payTo },
      status: { in: ['calculated', 'closed'] },
    },
    include: {
      earnings: {
        include: { employee: true },
        orderBy: { employeeId: 'asc' },
      },
      deductions: {
        include: { employee: true },
        orderBy: { employeeId: 'asc' },
      },
    },
    orderBy: { payFrom: 'asc' },
  });

  if (runs.length === 0) return null;

  const allEarnings = runs.flatMap(r => r.earnings);
  const allDeductions = runs.flatMap(r => r.deductions);

  // Deduplicate: sum earnings/deductions per employee across runs
  const employeeMap = new Map<number, {
    id: number;
    employeeCode: string;
    employeeName: string;
    grossPay: number;
    css: number;
    isr: number;
    seguro: number;
    otherDeductions: number;
    totalDeductions: number;
    netPay: number;
    runIds: number[];
  }>();

  allEarnings.forEach(earning => {
    const empId = earning.employeeId;
    if (!employeeMap.has(empId)) {
      employeeMap.set(empId, {
        id: empId,
        employeeCode: earning.employee.employeeCode,
        employeeName: `${earning.employee.firstName} ${earning.employee.lastName}`,
        grossPay: 0,
        css: 0,
        isr: 0,
        seguro: 0,
        otherDeductions: 0,
        totalDeductions: 0,
        netPay: 0,
        runIds: [],
      });
    }
    const emp = employeeMap.get(empId)!;
    emp.grossPay += earning.totalAmount;
    if (!emp.runIds.includes(earning.payrollRunId)) emp.runIds.push(earning.payrollRunId);
  });

  allDeductions.forEach(deduction => {
    const empId = deduction.employeeId;
    if (!employeeMap.has(empId)) {
      employeeMap.set(empId, {
        id: empId,
        employeeCode: deduction.employee.employeeCode,
        employeeName: `${deduction.employee.firstName} ${deduction.employee.lastName}`,
        grossPay: 0,
        css: 0,
        isr: 0,
        seguro: 0,
        otherDeductions: 0,
        totalDeductions: 0,
        netPay: 0,
        runIds: [],
      });
    }
    const emp = employeeMap.get(empId)!;
    if (deduction.deductionCode === 'CSS') emp.css += deduction.amount;
    else if (deduction.deductionCode === 'SEGURO_EDUCATIVO') emp.seguro += deduction.amount;
    else if (deduction.deductionCode === 'ISR') emp.isr += deduction.amount;
    else emp.otherDeductions += deduction.amount;
    emp.totalDeductions += deduction.amount;
  });

  const payrollData = Array.from(employeeMap.values()).map(emp => ({
    ...emp,
    netPay: emp.grossPay - emp.totalDeductions,
  }));

  const runIds = runs.map(r => r.id);
  const aggregatedFrom = runs[0].payFrom;
  const aggregatedTo = runs[runs.length - 1].payTo;

  return {
    id: null,
    payFrom: aggregatedFrom,
    payTo: aggregatedTo,
    status: 'aggregated',
    payrollData,
    earnings: allEarnings,
    deductions: allDeductions,
    runIds,
    runs,
  };
}

export async function getAcknowledgedWarnings(customerId: number) {
  return prisma.employeeWarningAcknowledgment.findMany({
    where: { customerId, acknowledged: true }
  });
}

export async function getThirteenthMonthParameters() {
  return prisma.thirteenthMonthParameter.findMany({
    orderBy: { effectiveFrom: "desc" },
  });
}

export async function getPayrollParameters() {
  return prisma.payrollParameter.findMany({
    where: { isActive: true },
    orderBy: { code: "asc" },
  });
}

export async function getAllPayrollParameters() {
  return prisma.payrollParameter.findMany({
    orderBy: { code: "asc" },
  });
}
