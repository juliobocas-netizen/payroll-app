import "server-only";
import { prisma } from "@/lib/prisma";
import { calculateTimePayroll, type TimeSegment, type ShiftType } from "@/lib/calculations/panama-time";
import { createAuditLog, createPayrollEarning, createPayrollDeduction, createPaymentOutput, createAccrual13thMonth, createPayrollSummary, clearPayrollRunEarningsAndDeductions, updatePayrollRunStatus } from "@/lib/db/mutations";

export interface PayrollResult {
  employeeId: number;
  employeeCode: string;
  employeeName: string;
  baseSalary: number;
  salaryType: string;
  payFrequency: string;
  hoursWorked: number;
  daysWorked: number;
  dayHours: number;
  eveningHours: number;
  nightHours: number;
  overtimeHours: number;
  shiftType: ShiftType | null;
  baseRate: number;
  breakdown: TimeSegment[];
  captureMode: string;
  premiums: number;
  totalPay: number;
  grossPay: number;
  css: number;
  seguroEducativo: number;
  isr: number;
  totalDeductions: number;
  netPay: number;
  xiiiMonthAccrual: number;
  earnings: Array<{ code: string; description: string; quantity: number; unitAmount: number; totalAmount: number; isTaxable: boolean }>;
  deductions: Array<{ code: string; description: string; amount: number; isStatutory: boolean }>;
}

function round(num: number): number {
  return Math.round(num * 100) / 100;
}

function getPayPeriodsPerYear(frequency: string): number {
  switch (frequency) {
    case "weekly": return 52;
    case "biweekly": return 26;
    case "monthly": return 12;
    default: return 12;
  }
}

function calculateCSS(grossPay: number, employeeRate: number, capAmount: number | null): number {
  const cap = capAmount || 4000;
  const taxableBase = Math.min(grossPay, cap);
  return round(taxableBase * employeeRate);
}

function calculateISR(
  periodGross: number,
  periodCSS: number,
  periodSeguro: number,
  payPeriodsPerYear: number,
  brackets: Array<{ rangeMin: number; rangeMax: number | null; rate: number }>,
  exemption: number = 11000
): number {
  const annualizedGross = periodGross * payPeriodsPerYear;
  const annualizedDeductions = (periodCSS + periodSeguro) * payPeriodsPerYear;
  const netTaxableIncome = annualizedGross - annualizedDeductions;

  if (netTaxableIncome <= exemption) return 0;

  let annualTax = 0;
  const sortedBrackets = [...brackets].sort((a, b) => a.rangeMin - b.rangeMin);

  for (const bracket of sortedBrackets) {
    if (netTaxableIncome > bracket.rangeMin) {
      const taxableInBracket = bracket.rangeMax
        ? Math.min(netTaxableIncome, bracket.rangeMax) - bracket.rangeMin
        : netTaxableIncome - bracket.rangeMin;
      if (taxableInBracket > 0) {
        annualTax += taxableInBracket * bracket.rate;
      }
    }
  }

  return round(annualTax / payPeriodsPerYear);
}

export async function calculatePayroll(payrollRunId: number, userId?: number): Promise<PayrollResult[]> {
  const payrollRun = await prisma.payrollRun.findUnique({
    where: { id: payrollRunId },
    include: {
      customer: true,
      calendar: true,
    },
  });

  if (!payrollRun) throw new Error("Payroll run not found");

  const frequency = payrollRun.calendar?.frequency || "monthly";
  const payPeriodsPerYear = getPayPeriodsPerYear(frequency);

  const employees = await prisma.employee.findMany({
    where: {
      customerId: payrollRun.customerId,
      isActive: true,
    },
    include: {
      department: true,
      position: true,
    },
  });

  const holidays = await prisma.holiday.findMany({
    where: { isNational: true },
    select: { holidayDate: true },
  });
  const holidayDates = new Set(holidays.map(holiday => holiday.holidayDate.toISOString().split("T")[0]));

  const isrBrackets = await prisma.isrTaxBracket.findMany({
    orderBy: { bracketOrder: "asc" },
  });

  const cssDeduction = await prisma.statutoryDeduction.findFirst({
    where: { code: "CSS", isActive: true },
  });

  const seguroDeduction = await prisma.statutoryDeduction.findFirst({
    where: { code: "SEGURO_EDUCATIVO", isActive: true },
  });

  const overtimeRule = await prisma.overtimeRule.findFirst({
    where: { isActive: true },
  });

  const cssRate = cssDeduction?.employeeRate || 0.0975;
  const cssCap = cssDeduction?.capAmount || 4000;
  const seguroRate = seguroDeduction?.employeeRate || 0.015;
  const otBaseDivisor = overtimeRule?.baseHourDivisor || 240;
  const otMultiplierDiurna = overtimeRule?.multiplierDiurna || 1.25;
  const otMultiplierHoliday = overtimeRule?.multiplierHoliday || 2.50;
  const otMultiplierRestday = overtimeRule?.multiplierRestday || 1.50;

  const results: PayrollResult[] = [];

  await clearPayrollRunEarningsAndDeductions(payrollRunId);

  // Load validated inputs for this run
  const payrollInputs = await prisma.payrollInput.findMany({
    where: { 
      payrollRunId,
      status: "validated"
    },
  });

  // Group inputs by employee
  const inputByEmployee: Record<number, any[]> = {};
  payrollInputs.forEach(input => {
    if (input.employeeId) {
      if (!inputByEmployee[input.employeeId]) inputByEmployee[input.employeeId] = [];
      inputByEmployee[input.employeeId].push(input);
    }
  });

  // Only process employees who have validated inputs for this run
  const employeesToProcess = employees.filter(emp => inputByEmployee[emp.id]);

  for (const emp of employeesToProcess) {
    const earnings: PayrollResult["earnings"] = [];
    const deductions: PayrollResult["deductions"] = [];
    const empInputs = inputByEmployee[emp.id];

    let grossPay = 0;
    const salaryType = emp.salaryType || "monthly";
    const hourlyRate = salaryType === "hourly" ? round(emp.baseSalary) : round(emp.baseSalary / otBaseDivisor);
    const daysWorked = Math.max(1, Math.ceil((payrollRun.payTo.getTime() - payrollRun.payFrom.getTime()) / 86400000) + 1);
    let hoursWorked = empInputs.reduce((sum, input) => sum + (input.regularHours || 0) + (input.overtimeHours || 0) + (input.holidayHours || 0) + (input.restDayHours || 0), 0);
    let premiums = 0;
    let dayHours = 0;
    let eveningHours = 0;
    let nightHours = 0;
    let overtimeHours = 0;
    let shiftType: ShiftType | null = null;
    let breakdown: TimeSegment[] = [];
    let captureMode = empInputs.some(input => input.captureMode === "in-out-times" || (input.startTime && input.endTime))
      ? "in-out-times"
      : empInputs.some(input => input.captureMode === "amounts" || input.inputType === "amount")
        ? "amounts"
        : "hours";

    if (salaryType === "monthly" && empInputs.some(input => input.inputType !== "amount")) {
      const basePay = round((emp.baseSalary / 30) * daysWorked);
      grossPay += basePay;
      earnings.push({
        code: "SALARIO",
        description: `Salario Mensual (${daysWorked} dias)`,
        quantity: daysWorked,
        unitAmount: round(emp.baseSalary / 30),
        totalAmount: basePay,
        isTaxable: true,
      });
    }

    function formatMinutesAsTime(totalMinutes: number) {
      const normalized = ((totalMinutes % 1440) + 1440) % 1440;
      const hours = Math.floor(normalized / 60);
      const mins = normalized % 60;
      return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
    }

    function getSegmentWindow(startTime: string, endTime: string, segment: "day" | "evening" | "night") {
      const startMinutes = Number(startTime.split(":")[0]) * 60 + Number(startTime.split(":")[1]);
      let endMinutes = Number(endTime.split(":")[0]) * 60 + Number(endTime.split(":")[1]);
      if (endMinutes <= startMinutes) endMinutes += 1440;

      const segmentLimits: Record<"day" | "evening" | "night", [number, number]> = {
        day: [6 * 60, 14 * 60],
        evening: [14 * 60, 22 * 60],
        night: [22 * 60, 30 * 60],
      };

      const [limitStart, limitEnd] = segmentLimits[segment];
      const windowStart = Math.max(startMinutes, limitStart);
      const windowEnd = Math.min(endMinutes, limitEnd);

      if (windowEnd <= windowStart) {
        return { start: formatMinutesAsTime(startMinutes), end: formatMinutesAsTime(endMinutes) };
      }

      return {
        start: formatMinutesAsTime(windowStart),
        end: formatMinutesAsTime(windowEnd),
      };
    }

    function getJornadaLabel(segment: "day" | "evening" | "night") {
      if (segment === "day") return "Jornada Diurna";
      if (segment === "evening") return "Jornada Mixta";
      return "Jornada Nocturna";
    }

    function buildSegmentEarning(inputDate: string, startTime: string, endTime: string, item: TimeSegment, baseRate: number) {
      const quantity = item.hours > 0 ? item.hours : item.overtimeHours;
      const unitAmount = round(baseRate * item.multiplier);
      const totalAmount = round(quantity * unitAmount);
      const kind = item.overtimeHours > 0 ? "Overtime" : "Regular";
      const { start, end } = getSegmentWindow(startTime, endTime, item.segment);
      const description = `${inputDate} | ${start}-${end} | ${getJornadaLabel(item.segment)} | ${kind}`;

      return {
        code: item.overtimeHours > 0 ? `OT_${item.segment.toUpperCase()}` : `REG_${item.segment.toUpperCase()}`,
        description,
        quantity,
        unitAmount,
        totalAmount,
        isTaxable: true,
      };
    }

    // Process Inputs
    for (const input of empInputs) {
      if (input.startTime && input.endTime) {
        const inputDate = input.date.toISOString().split("T")[0];
        const date = new Date(`${inputDate}T00:00:00Z`);
        const timeResult = calculateTimePayroll({
          startTime: input.startTime,
          endTime: input.endTime,
          breakMinutes: input.breakMinutes || 0,
          baseRate: hourlyRate,
          isSunday: date.getUTCDay() === 0,
          isHoliday: holidayDates.has(inputDate),
        });
        const regularBasePay = round(timeResult.totalHours * hourlyRate);
        const payableAmount = salaryType === "monthly"
          ? round(timeResult.totalPay - regularBasePay)
          : timeResult.totalPay;
        grossPay += payableAmount;
        premiums += salaryType === "monthly" ? payableAmount : timeResult.premiums;
        hoursWorked += timeResult.totalHours;
        dayHours += timeResult.dayHours;
        eveningHours += timeResult.eveningHours;
        nightHours += timeResult.nightHours;
        overtimeHours += timeResult.overtimeHours;
        shiftType = timeResult.shiftType;
        breakdown = [...breakdown, ...timeResult.breakdown];

        for (const item of timeResult.breakdown) {
          const quantity = item.hours > 0 ? item.hours : item.overtimeHours;
          if (quantity <= 0) continue;
          const segmentEarning = buildSegmentEarning(inputDate, input.startTime, input.endTime, item, hourlyRate);
          earnings.push(segmentEarning);
        }

        if ((input.breakMinutes || 0) > 0) {
          const breakHours = -(input.breakMinutes || 0) / 60;
          earnings.push({
            code: "DESCANSO",
            description: `${inputDate} | ${input.startTime}-${input.endTime} | Break | ${input.breakMinutes} minutes`,
            quantity: breakHours,
            unitAmount: 0,
            totalAmount: 0,
            isTaxable: false,
          });
        }
        continue;
      }

      if (input.inputType === "amount") {
        // Amount-based - no additional calculations, just sum the amounts
        const regularAmt = input.regularAmount || 0;
        const overtimeAmt = input.overtimeAmount || 0;
        const holidayAmt = input.holidayAmount || 0;
        const thirteenthAmt = input.thirteenthAmount || 0;
        const bonusAmt = input.bonusAmount || 0;
        const otherAmt = input.otherAmount || 0;

        if (regularAmt > 0) {
          grossPay += regularAmt;
          earnings.push({
            code: "SALARIO_REGULAR",
            description: `Salario Regular ${input.date.toLocaleDateString()}`,
            quantity: 1,
            unitAmount: regularAmt,
            totalAmount: regularAmt,
            isTaxable: true,
          });
        }
        if (overtimeAmt > 0) {
          grossPay += overtimeAmt;
          earnings.push({
            code: "SALARIO_EXTRA",
            description: `Salario Extra ${input.date.toLocaleDateString()}`,
            quantity: 1,
            unitAmount: overtimeAmt,
            totalAmount: overtimeAmt,
            isTaxable: true,
          });
        }
        if (holidayAmt > 0) {
          grossPay += holidayAmt;
          earnings.push({
            code: "SALARIO_FERIADO",
            description: `Salario Feriado ${input.date.toLocaleDateString()}`,
            quantity: 1,
            unitAmount: holidayAmt,
            totalAmount: holidayAmt,
            isTaxable: true,
          });
        }
        if (thirteenthAmt > 0) {
          grossPay += thirteenthAmt;
          earnings.push({
            code: "DECIMO_TERCER",
            description: `Décimo Tercer Mes ${input.date.toLocaleDateString()}`,
            quantity: 1,
            unitAmount: thirteenthAmt,
            totalAmount: thirteenthAmt,
            isTaxable: true,
          });
        }
        if (bonusAmt > 0) {
          grossPay += bonusAmt;
          earnings.push({
            code: "BONO",
            description: `Bono ${input.date.toLocaleDateString()}`,
            quantity: 1,
            unitAmount: bonusAmt,
            totalAmount: bonusAmt,
            isTaxable: true,
          });
        }
        if (otherAmt > 0) {
          grossPay += otherAmt;
          earnings.push({
            code: "OTROS",
            description: `Otros Ingresos ${input.date.toLocaleDateString()}`,
            quantity: 1,
            unitAmount: otherAmt,
            totalAmount: otherAmt,
            isTaxable: true,
          });
        }
      } else {
        // Hours-based - calculate based on salary and Panamanian law
        const reg = input.regularHours || 0;
        const ot = input.overtimeHours || 0;
        const hol = input.holidayHours || 0;
        const rest = input.restDayHours || 0;

        if (reg > 0 && salaryType === "hourly") {
          const amount = round(reg * hourlyRate);
          grossPay += amount;
          earnings.push({
            code: "SALARIO",
            description: `Horas Regulares ${input.date.toLocaleDateString()}`,
            quantity: reg,
            unitAmount: hourlyRate,
            totalAmount: amount,
            isTaxable: true,
          });
        }
        if (ot > 0) {
          const amount = round(ot * hourlyRate * otMultiplierDiurna);
          grossPay += amount;
          premiums += amount;
          earnings.push({
            code: "HORA_EXTRA",
            description: `Horas Extra ${input.date.toLocaleDateString()}`,
            quantity: ot,
            unitAmount: round(hourlyRate * otMultiplierDiurna),
            totalAmount: amount,
            isTaxable: true,
          });
        }
        if (hol > 0) {
          const amount = round(hol * hourlyRate * otMultiplierHoliday);
          grossPay += amount;
          premiums += amount;
          earnings.push({
            code: "HORA_FERIADO",
            description: `Horas Feriado ${input.date.toLocaleDateString()}`,
            quantity: hol,
            unitAmount: round(hourlyRate * otMultiplierHoliday),
            totalAmount: amount,
            isTaxable: true,
          });
        }
        if (rest > 0) {
          const amount = round(rest * hourlyRate * otMultiplierRestday);
          grossPay += amount;
          premiums += amount;
          earnings.push({
            code: "HORA_DESCANSO",
            description: `Horas Descanso ${input.date.toLocaleDateString()}`,
            quantity: rest,
            unitAmount: round(hourlyRate * otMultiplierRestday),
            totalAmount: amount,
            isTaxable: true,
          });
        }
      }
    }

    // Save Earnings to DB
    for (const earning of earnings) {
      await createPayrollEarning({
        payrollRunId,
        employeeId: emp.id,
        earningCode: earning.code,
        description: earning.description,
        quantity: earning.quantity,
        unitAmount: earning.unitAmount,
        totalAmount: earning.totalAmount,
        isTaxable: earning.isTaxable,
        createdBy: userId,
      });
    }

    const recurringItems = await prisma.employeeRecurringItem.findMany({
      where: { employeeId: emp.id, isActive: true },
    });

    for (const item of recurringItems) {
      if (item.itemType === "earning") {
        const earningAmount = item.amount;
        grossPay += earningAmount;
        earnings.push({
          code: item.code,
          description: item.code,
          quantity: 1,
          unitAmount: earningAmount,
          totalAmount: earningAmount,
          isTaxable: true,
        });
        await createPayrollEarning({
          payrollRunId,
          employeeId: emp.id,
          earningCode: item.code,
          quantity: 1,
          unitAmount: earningAmount,
          totalAmount: earningAmount,
          isTaxable: true,
          createdBy: userId,
        });
      } else {
        deductions.push({
          code: item.code,
          description: item.code,
          amount: item.amount,
          isStatutory: false,
        });
        await createPayrollDeduction({
          payrollRunId,
          employeeId: emp.id,
          deductionCode: item.code,
          amount: item.amount,
          isStatutory: false,
          createdBy: userId,
        });
      }
    }

    const css = calculateCSS(grossPay, cssRate, cssCap);
    const seguro = calculateCSS(grossPay, seguroRate, cssCap);

    deductions.push({
      code: "CSS",
      description: "Caja de Seguro Social",
      amount: css,
      isStatutory: true,
    });
    deductions.push({
      code: "SEGURO_EDUCATIVO",
      description: "Seguro Educativo",
      amount: seguro,
      isStatutory: true,
    });

    await createPayrollDeduction({
      payrollRunId,
      employeeId: emp.id,
      deductionCode: "CSS",
      description: "Caja de Seguro Social",
      amount: css,
      isStatutory: true,
      createdBy: userId,
    });

    await createPayrollDeduction({
      payrollRunId,
      employeeId: emp.id,
      deductionCode: "SEGURO_EDUCATIVO",
      description: "Seguro Educativo",
      amount: seguro,
      isStatutory: true,
      createdBy: userId,
    });

    const isr = calculateISR(
      grossPay,
      css,
      seguro,
      payPeriodsPerYear,
      isrBrackets.map(b => ({ rangeMin: b.rangeMin, rangeMax: b.rangeMax, rate: b.rate }))
    );

    if (isr > 0) {
      deductions.push({
        code: "ISR",
        description: "Impuesto Sobre la Renta",
        amount: isr,
        isStatutory: true,
      });
      await createPayrollDeduction({
        payrollRunId,
        employeeId: emp.id,
        deductionCode: "ISR",
        description: "Impuesto Sobre la Renta",
        amount: isr,
        isStatutory: true,
        createdBy: userId,
      });
    }

    const xiiiMonthAccrual = round(grossPay / 12);

    await createAccrual13thMonth({
      employeeId: emp.id,
      payrollRunId,
      amountAccrued: xiiiMonthAccrual,
      periodYear: payrollRun.payFrom.getFullYear(),
      periodQuarter: Math.floor((payrollRun.payFrom.getMonth() + 1 - 1) / 3) + 1,
    });

    const totalDeductions = round(css + seguro + isr + deductions.filter(d => !["CSS", "SEGURO_EDUCATIVO", "ISR"].includes(d.code)).reduce((s, d) => s + d.amount, 0));
    const netPay = round(grossPay - totalDeductions);

    results.push({
      employeeId: emp.id,
      employeeCode: emp.employeeCode,
      employeeName: `${emp.firstName} ${emp.lastName}`,
      baseSalary: emp.baseSalary,
      salaryType,
      payFrequency: frequency,
      hoursWorked,
      daysWorked: salaryType === "monthly" ? daysWorked : 0,
      dayHours: round(dayHours),
      eveningHours: round(eveningHours),
      nightHours: round(nightHours),
      overtimeHours: round(overtimeHours),
      shiftType,
      baseRate: hourlyRate,
      breakdown,
      captureMode,
      premiums: round(premiums),
      totalPay: grossPay,
      grossPay,
      css,
      seguroEducativo: seguro,
      isr,
      totalDeductions,
      netPay,
      xiiiMonthAccrual,
      earnings,
      deductions,
    });

    await createPaymentOutput({
      payrollRunId,
      employeeId: emp.id,
      paymentMethod: emp.paymentMethod,
      bankId: emp.bankId || undefined,
      amountPaid: netPay,
      generatedBy: userId,
    });
  }

  const totalGross = round(results.reduce((s, r) => s + r.grossPay, 0));
  const totalDeductions = round(results.reduce((s, r) => s + r.totalDeductions, 0));
  const totalNet = round(results.reduce((s, r) => s + r.netPay, 0));
  const totalCssEmployee = round(results.reduce((s, r) => s + r.css, 0));
  const totalIsr = round(results.reduce((s, r) => s + r.isr, 0));
  const totalXiiiMonth = round(results.reduce((s, r) => s + r.xiiiMonthAccrual, 0));

  await createPayrollSummary({
    payrollRunId,
    totalGross,
    totalDeductions,
    totalNet,
    totalCssEmployer: round(totalCssEmployee * 1.282),
    totalCssEmployee,
    totalIsr,
    totalXiiiMonth,
    employeeCount: results.length,
  });

  await updatePayrollRunStatus(payrollRunId, "calculated", userId);

  await createAuditLog({
    tableName: "PayrollRun",
    recordId: payrollRunId.toString(),
    action: "CALCULATE",
    changedBy: userId,
    notes: `Payroll calculated for run ${payrollRunId}, ${results.length} employees`,
  });

  return results;
}
