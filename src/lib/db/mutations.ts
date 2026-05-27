import "server-only";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";

export async function createEmployee(data: {
  customerId: number;
  employeeCode: string;
  firstName: string;
  lastName: string;
  identificationNumber: string;
  idType?: string;
  sssNumber?: string;
  birthDate?: Date;
  departmentId?: number;
  positionId?: number;
  baseSalary: number;
  salaryFrequency?: string;
  paymentMethod?: string;
  bankId?: number;
  accountNumber?: string;
  accountType?: string;
  isOvertimeEligible?: boolean;
  restDay?: string;
  hireDate?: Date;
  metadata?: string;
}) {
  return prisma.employee.create({
    data: {
      ...data,
      idType: data.idType || "cedula",
      salaryFrequency: data.salaryFrequency || "monthly",
      paymentMethod: data.paymentMethod || "cash",
      isOvertimeEligible: data.isOvertimeEligible ?? true,
      restDay: data.restDay || "domingo",
    },
  });
}

export async function updateEmployee(id: number, data: {
  employeeCode?: string;
  firstName?: string;
  lastName?: string;
  identificationNumber?: string;
  idType?: string;
  sssNumber?: string;
  birthDate?: Date;
  departmentId?: number;
  positionId?: number;
  baseSalary?: number;
  salaryFrequency?: string;
  paymentMethod?: string;
  bankId?: number;
  accountNumber?: string;
  accountType?: string;
  isOvertimeEligible?: boolean;
  restDay?: string;
  hireDate?: Date;
  terminationDate?: Date;
  isActive?: boolean;
  metadata?: string;
}) {
  const existing = await prisma.employee.findUnique({ where: { id } });
  return prisma.employee.update({
    where: { id },
    data: {
      ...(data.employeeCode !== undefined && { employeeCode: data.employeeCode }),
      ...(data.firstName !== undefined && { firstName: data.firstName }),
      ...(data.lastName !== undefined && { lastName: data.lastName }),
      ...(data.identificationNumber !== undefined && { identificationNumber: data.identificationNumber }),
      ...(data.idType !== undefined && { idType: data.idType }),
      ...(data.sssNumber !== undefined && { sssNumber: data.sssNumber }),
      ...(data.birthDate !== undefined && { birthDate: data.birthDate }),
      ...(data.departmentId !== undefined && { departmentId: data.departmentId }),
      ...(data.positionId !== undefined && { positionId: data.positionId }),
      ...(data.baseSalary !== undefined && { baseSalary: data.baseSalary }),
      ...(data.salaryFrequency !== undefined && { salaryFrequency: data.salaryFrequency }),
      ...(data.paymentMethod !== undefined && { paymentMethod: data.paymentMethod }),
      ...(data.bankId !== undefined && { bankId: data.bankId }),
      ...(data.accountNumber !== undefined && { accountNumber: data.accountNumber }),
      ...(data.accountType !== undefined && { accountType: data.accountType }),
      ...(data.isOvertimeEligible !== undefined && { isOvertimeEligible: data.isOvertimeEligible }),
      ...(data.restDay !== undefined && { restDay: data.restDay }),
      ...(data.hireDate !== undefined && { hireDate: data.hireDate }),
      ...(data.terminationDate !== undefined && { terminationDate: data.terminationDate }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
      ...(data.metadata !== undefined && { metadata: data.metadata }),
    },
  });
}

export async function deleteEmployee(id: number) {
  return prisma.employee.update({
    where: { id },
    data: { isActive: false },
  });
}

export async function createCustomer(data: {
  name: string;
  ruc?: string;
  address?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  servicioFee?: number;
  status?: string;
  metadata?: string;
}) {
  return prisma.customer.create({ data });
}

export async function updateCustomer(id: number, data: {
  name?: string;
  ruc?: string;
  address?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  servicioFee?: number;
  status?: string;
  metadata?: string;
}) {
  return prisma.customer.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.ruc !== undefined && { ruc: data.ruc }),
      ...(data.address !== undefined && { address: data.address }),
      ...(data.contactName !== undefined && { contactName: data.contactName }),
      ...(data.contactEmail !== undefined && { contactEmail: data.contactEmail }),
      ...(data.contactPhone !== undefined && { contactPhone: data.contactPhone }),
      ...(data.servicioFee !== undefined && { servicioFee: data.servicioFee }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.metadata !== undefined && { metadata: data.metadata }),
    },
  });
}

export async function createDepartment(data: { customerId: number; name: string }) {
  return prisma.department.create({ data });
}

export async function updateDepartment(id: number, data: { name?: string; isActive?: boolean }) {
  return prisma.department.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    },
  });
}

export async function createPosition(data: { customerId: number; title: string }) {
  return prisma.position.create({ data });
}

export async function updatePosition(id: number, data: { title?: string; isActive?: boolean }) {
  return prisma.position.update({
    where: { id },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    },
  });
}

export async function createBank(data: {
  bankName: string;
  routingNumber?: string;
  address?: string;
  contactName?: string;
  phone?: string;
  email?: string;
  currency?: string;
}) {
  return prisma.bank.create({
    data: {
      ...data,
      currency: data.currency || "PAB",
    },
  });
}

export async function updateBank(id: number, data: {
  bankName?: string;
  routingNumber?: string;
  address?: string;
  contactName?: string;
  phone?: string;
  email?: string;
  currency?: string;
  isActive?: boolean;
}) {
  return prisma.bank.update({
    where: { id },
    data,
  });
}

export async function deleteBank(id: number) {
  return prisma.bank.update({
    where: { id },
    data: { isActive: false },
  });
}

export async function createPayCalendar(data: {
  customerId: number;
  frequency: string;
  payFrom: Date;
  payTo: Date;
  paymentDate: Date;
  periodLabel?: string;
}) {
  return prisma.payCalendar.create({ data });
}

export async function updatePayCalendar(id: number, data: {
  frequency?: string;
  payFrom?: Date;
  payTo?: Date;
  paymentDate?: Date;
  periodLabel?: string;
  isActive?: boolean;
}) {
  return prisma.payCalendar.update({
    where: { id },
    data,
  });
}

export async function deletePayCalendar(id: number) {
  return prisma.payCalendar.update({
    where: { id },
    data: { isActive: false },
  });
}

export async function createPayrollRun(data: {
  customerId: number;
  calendarId?: number;
  payFrom: Date;
  payTo: Date;
  paymentDate: Date;
  notes?: string;
}) {
  return prisma.payrollRun.create({
    data: {
      ...data,
      status: "draft",
    },
  });
}

export async function updatePayrollRunStatus(id: number, status: string, userId?: number) {
  const updateData: Record<string, unknown> = { status };
  if (status === "calculated" && userId) {
    updateData.calculatedBy = userId;
    updateData.calculatedAt = new Date();
  }
  if (status === "approved" && userId) {
    updateData.approvedBy = userId;
    updateData.approvedAt = new Date();
  }
  if (status === "closed" && userId) {
    updateData.closedBy = userId;
    updateData.closedAt = new Date();
  }
  return prisma.payrollRun.update({
    where: { id },
    data: updateData,
  });
}

export async function createPayrollEarning(data: {
  payrollRunId: number;
  employeeId: number;
  earningCode: string;
  description?: string;
  quantity?: number;
  unitAmount: number;
  totalAmount: number;
  isTaxable?: boolean;
  createdBy?: number;
}) {
  return prisma.payrollEarning.create({
    data: {
      ...data,
      quantity: data.quantity || 1,
      isTaxable: data.isTaxable ?? true,
    },
  });
}

export async function createPayrollDeduction(data: {
  payrollRunId: number;
  employeeId: number;
  deductionCode: string;
  description?: string;
  amount: number;
  isStatutory?: boolean;
  createdBy?: number;
}) {
  return prisma.payrollDeduction.create({
    data: {
      ...data,
      isStatutory: data.isStatutory ?? false,
    },
  });
}

export async function createPaymentOutput(data: {
  payrollRunId: number;
  employeeId: number;
  paymentMethod: string;
  bankId?: number;
  amountPaid: number;
  generatedBy?: number;
  exportRow?: string;
}) {
  return prisma.paymentOutput.create({
    data: {
      ...data,
      paymentStatus: "pending",
      generatedAt: new Date(),
    },
  });
}

export async function createAccrual13thMonth(data: {
  employeeId: number;
  payrollRunId: number;
  amountAccrued: number;
  periodYear: number;
  periodQuarter?: number;
}) {
  return prisma.accrual13thMonth.create({
    data: {
      ...data,
      periodQuarter: data.periodQuarter || 1,
    },
  });
}

export async function updateVacationAccrual(employeeId: number, data: {
  earnedDays?: number;
  usedDays?: number;
  balanceDays?: number;
}) {
  return prisma.vacationAccrual.upsert({
    where: { id: employeeId },
    create: {
      employeeId,
      earnedDays: data.earnedDays || 0,
      usedDays: data.usedDays || 0,
      balanceDays: data.balanceDays || 0,
    },
    update: {
      ...(data.earnedDays !== undefined && { earnedDays: data.earnedDays }),
      ...(data.usedDays !== undefined && { usedDays: data.usedDays }),
      ...(data.balanceDays !== undefined && { balanceDays: data.balanceDays }),
      lastUpdated: new Date(),
    },
  });
}

export async function createAuditLog(data: {
  tableName: string;
  recordId: string;
  action: string;
  changedBy?: number;
  oldValue?: string;
  newValue?: string;
  referenceFileId?: number;
  notes?: string;
}) {
  return prisma.auditLog.create({ data });
}

export async function createUser(data: {
  username: string;
  password: string;
  email: string;
  fullName?: string;
  roleId: number;
  customerId?: number;
  languagePref?: string;
  dateFormat?: string;
  currencyDisplay?: string;
}) {
  const hashedPassword = await bcrypt.hash(data.password, 10);
  return prisma.user.create({
    data: {
      username: data.username,
      passwordHash: hashedPassword,
      email: data.email,
      fullName: data.fullName,
      roleId: data.roleId,
      customerId: data.customerId,
      languagePref: data.languagePref || "es",
      dateFormat: data.dateFormat || "DD/MM/YYYY",
      currencyDisplay: data.currencyDisplay || "USD",
    },
  });
}

export async function createImportStagedData(data: {
  customerId: number;
  payrollPeriodId?: number;
  uploadedBy?: number;
  fileId?: number;
  rowData: string;
  status?: string;
  errorMessages?: string;
  fileHash?: string;
}) {
  return prisma.importStagedData.create({
    data: {
      ...data,
      status: data.status || "pending",
    },
  });
}

export async function createImportHistory(data: {
  customerId: number;
  payrollPeriodId?: number;
  fileId?: number;
  uploadedBy?: number;
  rowCount: number;
  validCount: number;
  errorCount: number;
  fileHash?: string;
  metadata?: string;
}) {
  return prisma.importHistory.create({ data });
}

export async function createPayrollSummary(data: {
  payrollRunId: number;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  totalCssEmployer?: number;
  totalCssEmployee?: number;
  totalIsr?: number;
  totalXiiiMonth?: number;
  employeeCount?: number;
}) {
  return prisma.payrollSummary.create({ data });
}

export async function clearPayrollRunEarningsAndDeductions(payrollRunId: number) {
  await prisma.payrollEarning.deleteMany({ where: { payrollRunId } });
  await prisma.payrollDeduction.deleteMany({ where: { payrollRunId } });
}

export async function upsertPayrollInput(data: {
  payrollRunId: number;
  employeeCode: string;
  date: Date;
  regularHours?: number;
  overtimeHours?: number;
  holidayHours?: number;
  restDayHours?: number;
  dailyAmount?: number;
  regularAmount?: number;
  overtimeAmount?: number;
  holidayAmount?: number;
  thirteenthAmount?: number;
  bonusAmount?: number;
  otherAmount?: number;
  inputType: string;
  source: string;
  employeeId?: number;
}) {
  let employeeId = data.employeeId;
  if (!employeeId) {
    const emp = await prisma.employee.findFirst({
      where: { employeeCode: data.employeeCode }
    });
    employeeId = emp?.id;
  }

  const existing = await prisma.payrollInput.findFirst({
    where: {
      payrollRunId: data.payrollRunId,
      employeeCode: data.employeeCode,
      date: data.date,
    },
  });

  // Strip relation fields and metadata to avoid Prisma error during update/create
  const { 
    id: _id, 
    employee: _emp, 
    payrollRun: _run, 
    createdAt: _ca, 
    updatedAt: _ua, 
    ...cleanData 
  }: any = data;

  if (existing) {
    return prisma.payrollInput.update({
      where: { id: existing.id },
      data: {
        ...cleanData,
        employeeId,
        status: "pending",
      },
    });
  } else {
    return prisma.payrollInput.create({
      data: {
        ...cleanData,
        employeeId,
        status: "pending",
      },
    });
  }
}

export async function deletePayrollRun(payrollRunId: number) {
  await prisma.payrollInput.deleteMany({ where: { payrollRunId } });
  await prisma.payrollEarning.deleteMany({ where: { payrollRunId } });
  await prisma.payrollDeduction.deleteMany({ where: { payrollRunId } });
  return prisma.payrollRun.delete({ where: { id: payrollRunId } });
}

export async function validatePayrollInputs(payrollRunId: number) {
  const inputs = await prisma.payrollInput.findMany({
    where: { payrollRunId },
  });

  const payrollRun = await prisma.payrollRun.findUnique({
    where: { id: payrollRunId },
    select: { customerId: true },
  });

  if (!payrollRun) return;

  for (const input of inputs) {
    const employee = await prisma.employee.findFirst({
      where: {
        employeeCode: input.employeeCode,
        customerId: payrollRun.customerId,
      },
    });

    if (!employee) {
      await prisma.payrollInput.update({
        where: { id: input.id },
        data: {
          status: "error",
          errorMessages: "Employee not found in customer master.",
        },
      });
    } else {
      await prisma.payrollInput.update({
        where: { id: input.id },
        data: {
          status: "validated",
          employeeId: employee.id,
          errorMessages: null,
        },
      });
    }
  }
}

export async function deletePayrollInput(id: number) {
  return prisma.payrollInput.delete({ where: { id } });
}

export async function clearPayrollInputs(payrollRunId: number) {
  return prisma.payrollInput.deleteMany({
    where: { payrollRunId },
  });
}

export async function createThirteenthMonthParameter(data: {
  effectiveFrom: Date; effectiveTo?: Date; calculationMethod?: string;
  accrualPercentage?: number; employerRate?: number; paymentSchedule?: string;
  isActive?: boolean; metadata?: string;
}) {
  return prisma.thirteenthMonthParameter.create({ data });
}

export async function updateThirteenthMonthParameter(id: number, data: {
  effectiveFrom?: Date; effectiveTo?: Date; calculationMethod?: string;
  accrualPercentage?: number; employerRate?: number; paymentSchedule?: string;
  isActive?: boolean; metadata?: string;
}) {
  return prisma.thirteenthMonthParameter.update({ where: { id }, data });
}

export async function deleteThirteenthMonthParameter(id: number) {
  return prisma.thirteenthMonthParameter.update({ where: { id }, data: { isActive: false, effectiveTo: new Date() } });
}

export async function createPayrollParameter(data: {
  code: string; description?: string; value: string; dataType?: string;
  effectiveFrom: Date; effectiveTo?: Date; isActive?: boolean; metadata?: string;
}) {
  return prisma.payrollParameter.create({ data });
}

export async function updatePayrollParameter(id: number, data: {
  code?: string; description?: string; value?: string; dataType?: string;
  effectiveFrom?: Date; effectiveTo?: Date; isActive?: boolean; metadata?: string;
}) {
  return prisma.payrollParameter.update({ where: { id }, data });
}

export async function deletePayrollParameter(id: number) {
  return prisma.payrollParameter.update({ where: { id }, data: { isActive: false } });
}

export async function updateUserPreferences(userId: number, data: {
  languagePref?: string;
  dateFormat?: string;
  currencyDisplay?: string;
  fullName?: string;
  email?: string;
}) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      ...(data.languagePref !== undefined && { languagePref: data.languagePref }),
      ...(data.dateFormat !== undefined && { dateFormat: data.dateFormat }),
      ...(data.currencyDisplay !== undefined && { currencyDisplay: data.currencyDisplay }),
      ...(data.fullName !== undefined && { fullName: data.fullName }),
      ...(data.email !== undefined && { email: data.email }),
    },
  });
}

export async function updatePassword(userId: number, currentPassword: string, newPassword: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");
  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) throw new Error("Current password is incorrect");
  const passwordHash = await bcrypt.hash(newPassword, 10);
  return prisma.user.update({ where: { id: userId }, data: { passwordHash } });
}

export async function acknowledgeWarning(employeeId: number, customerId: number, warningType: string) {
  return prisma.employeeWarningAcknowledgment.upsert({
    where: {
      customerId_employeeId_warningType: {
        customerId,
        employeeId,
        warningType,
      },
    },
    update: { acknowledged: true },
    create: {
      customerId,
      employeeId,
      warningType,
      acknowledged: true,
    },
  });
}

// --- Parameter Table Mutations ---

export async function createStatutoryDeduction(data: {
  code: string; description?: string; rate?: number; capAmount?: number;
  employeeRate?: number; employerRate?: number; effectiveFrom: Date;
  effectiveTo?: Date; isActive?: boolean;
}) {
  return prisma.statutoryDeduction.create({ data });
}

export async function updateStatutoryDeduction(id: number, data: {
  code?: string; description?: string; rate?: number; capAmount?: number;
  employeeRate?: number; employerRate?: number; effectiveFrom?: Date;
  effectiveTo?: Date; isActive?: boolean;
}) {
  return prisma.statutoryDeduction.update({ where: { id }, data });
}

export async function deleteStatutoryDeduction(id: number) {
  return prisma.statutoryDeduction.update({ where: { id }, data: { isActive: false } });
}

export async function createIsrTaxBracket(data: {
  effectiveFrom: Date; effectiveTo?: Date; bracketOrder: number;
  rangeMin: number; rangeMax?: number; rate: number; fixedAmount?: number;
}) {
  return prisma.isrTaxBracket.create({ data });
}

export async function updateIsrTaxBracket(id: number, data: {
  effectiveFrom?: Date; effectiveTo?: Date; bracketOrder?: number;
  rangeMin?: number; rangeMax?: number; rate?: number; fixedAmount?: number;
}) {
  return prisma.isrTaxBracket.update({ where: { id }, data });
}

export async function deleteIsrTaxBracket(id: number) {
  const bracket = await prisma.isrTaxBracket.findUnique({ where: { id } });
  if (bracket) {
    await prisma.isrTaxBracket.update({ where: { id }, data: { effectiveTo: new Date() } });
  }
}

export async function createIsrSetting(data: {
  effectiveFrom: Date; effectiveTo?: Date; calculationMethod?: string;
  roundingMethod?: string; applyCssBeforeIsr?: boolean;
  applySeguroEducativo?: boolean; metadata?: string;
}) {
  return prisma.isrSetting.create({ data });
}

export async function updateIsrSetting(id: number, data: {
  effectiveFrom?: Date; effectiveTo?: Date; calculationMethod?: string;
  roundingMethod?: string; applyCssBeforeIsr?: boolean;
  applySeguroEducativo?: boolean; metadata?: string;
}) {
  return prisma.isrSetting.update({ where: { id }, data });
}

export async function deleteIsrSetting(id: number) {
  return prisma.isrSetting.update({ where: { id }, data: { effectiveTo: new Date() } });
}

export async function createOvertimeRule(data: {
  customerId?: number; baseHourDivisor?: number; multiplierDiurna?: number;
  multiplierNocturna?: number; multiplierMixta?: number;
  multiplierRestday?: number; multiplierHoliday?: number;
  stackMultipliers?: boolean; maxHoursPerDay?: number;
  maxHoursPerWeek?: number; effectiveFrom: Date; effectiveTo?: Date; isActive?: boolean;
}) {
  return prisma.overtimeRule.create({ data });
}

export async function updateOvertimeRule(id: number, data: {
  customerId?: number; baseHourDivisor?: number; multiplierDiurna?: number;
  multiplierNocturna?: number; multiplierMixta?: number;
  multiplierRestday?: number; multiplierHoliday?: number;
  stackMultipliers?: boolean; maxHoursPerDay?: number;
  maxHoursPerWeek?: number; effectiveFrom?: Date; effectiveTo?: Date; isActive?: boolean;
}) {
  return prisma.overtimeRule.update({ where: { id }, data });
}

export async function deleteOvertimeRule(id: number) {
  return prisma.overtimeRule.update({ where: { id }, data: { isActive: false } });
}

export async function createHoliday(data: {
  country?: string; holidayDate: Date; name: string; isNational?: boolean;
}) {
  return prisma.holiday.create({ data });
}

export async function updateHoliday(id: number, data: {
  country?: string; holidayDate?: Date; name?: string; isNational?: boolean;
}) {
  return prisma.holiday.update({ where: { id }, data });
}

export async function deleteHoliday(id: number) {
  return prisma.holiday.delete({ where: { id } });
}
