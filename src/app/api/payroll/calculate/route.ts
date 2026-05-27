// filepath: src/app/api/payroll/calculate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================
// ISR CALCULATION ENGINE
// ============================================
async function calculateISR(annualIncome: number, prismaClient: PrismaClient): Promise<number> {
  // Get active ISR brackets
  const brackets = await prismaClient.isrTaxBracket.findMany({
    where: {
      effectiveFrom: { lte: new Date() },
      OR: [
        { effectiveTo: null },
        { effectiveTo: { gte: new Date() } },
      ],
    },
    orderBy: { bracketOrder: 'asc' },
  });

  // Get ISR settings
  const settings = await prismaClient.isrSetting.findFirst({
    where: {
      effectiveFrom: { lte: new Date() },
      OR: [
        { effectiveTo: null },
        { effectiveTo: { gte: new Date() } },
      ],
    },
  });

  // Get statutory deductions to subtract before ISR
  const statutoryDeductions = await prismaClient.statutoryDeduction.findMany({
    where: { isActive: true },
  });

  // Calculate deductions to subtract from gross income
  let deductions = 0;
  if (settings?.applyCssBeforeIsr) {
    const css = statutoryDeductions.find(d => d.code === 'CSS');
    if (css && css.employeeRate) {
      deductions += annualIncome * css.employeeRate;
    }
  }
  if (settings?.applySeguroEducativo) {
    const seguro = statutoryDeductions.find(d => d.code === 'SEGURO_EDUCATIVO');
    if (seguro && seguro.employeeRate) {
      deductions += annualIncome * seguro.employeeRate;
    }
  }

  // Taxable base
  const taxableIncome = Math.max(0, annualIncome - deductions);

  // Calculate ISR using progressive brackets
  let annualISR = 0;
  for (const bracket of brackets) {
    if (taxableIncome > bracket.rangeMin) {
      const taxableInBracket = bracket.rangeMax 
        ? Math.min(taxableIncome, bracket.rangeMax) - bracket.rangeMin
        : taxableIncome - bracket.rangeMin;
      
      if (taxableInBracket > 0) {
        annualISR += taxableInBracket * bracket.rate;
      }
    }
  }

  // Apply rounding method
  const roundingMethod = settings?.roundingMethod || 'nearest';
  let periodISR = annualISR / 12; // Monthly proration
  
  if (roundingMethod === 'up') {
    periodISR = Math.ceil(periodISR * 100) / 100;
  } else if (roundingMethod === 'down') {
    periodISR = Math.floor(periodISR * 100) / 100;
  } else {
    periodISR = Math.round(periodISR * 100) / 100;
  }

  return periodISR;
}

// ============================================
// OVERTIME CALCULATION ENGINE
// ============================================
async function calculateOvertime(
  employeeId: number,
  hoursWorked: { type: string; hours: number }[],
  prismaClient: PrismaClient
): Promise<{ code: string; amount: number; description: string }[]> {
  // Get overtime rules
  const overtimeRule = await prismaClient.overtimeRule.findFirst({
    where: {
      OR: [
        { customerId: null },
        { isActive: true },
      ],
    },
    orderBy: { id: 'asc' },
  });

  if (!overtimeRule) {
    return [];
  }

  // Get employee to calculate hourly rate
  const employee = await prismaClient.employee.findUnique({
    where: { id: employeeId },
  });

  if (!employee) {
    return [];
  }

  // Calculate hourly rate based on salary frequency
  let hourlyRate: number;
  switch (employee.salaryFrequency) {
    case 'hourly':
      hourlyRate = employee.baseSalary;
      break;
    case 'weekly':
      hourlyRate = employee.baseSalary / 40;
      break;
    case 'monthly':
    default:
      hourlyRate = employee.baseSalary / overtimeRule.baseHourDivisor;
  }

  const earnings: { code: string; amount: number; description: string }[] = [];

  for (const work of hoursWorked) {
    if (work.hours <= 0) continue;

    let multiplier = 1;
    let code = '';
    let description = '';

    switch (work.type) {
      case 'diurna':
        multiplier = overtimeRule.multiplierDiurna;
        code = 'HORAS_EXTRA_DIURNA';
        description = 'Horas Extra Diurnas';
        break;
      case 'nocturna':
        multiplier = overtimeRule.multiplierNocturna;
        code = 'HORAS_EXTRA_NOCTURNA';
        description = 'Horas Extra Nocturnas';
        break;
      case 'mixta':
        multiplier = overtimeRule.multiplierMixta;
        code = 'HORAS_EXTRA_MIXTA';
        description = 'Horas Extra Mixtas';
        break;
      case 'restday':
        multiplier = overtimeRule.multiplierRestday;
        code = 'HORAS_DIA_DESCANSO';
        description = 'Horas en Día de Descanso';
        break;
      case 'holiday':
        multiplier = overtimeRule.multiplierHoliday;
        code = 'HORAS_FERIADO';
        description = 'Horas en Día Feriado';
        break;
      default:
        continue;
    }

    const amount = work.hours * hourlyRate * multiplier;
    earnings.push({ code, amount, description });
  }

  return earnings;
}

// ============================================
// XIII MONTH (13th Month) CALCULATION
// ============================================
async function calculateXIIIMonth(
  employeeId: number,
  payrollRunId: number,
  prismaClient: PrismaClient
): Promise<number> {
  // Get all earnings for this payroll run
  const earnings = await prismaClient.payrollEarning.findMany({
    where: {
      employeeId,
      payrollRunId,
      isTaxable: true,
    },
  });

  const totalTaxableEarnings = earnings.reduce((sum, e) => sum + e.totalAmount, 0);

  // XIII Month is 1/12 of all taxable earnings
  const xiiiAmount = totalTaxableEarnings / 12;

  return Math.round(xiiiAmount * 100) / 100;
}

// POST /api/payroll/calculate - Run payroll calculation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { payrollRunId, employeeIds, earnings, deductions } = body;

    if (!payrollRunId) {
      return NextResponse.json(
        { error: 'Payroll run ID is required' },
        { status: 400 }
      );
    }

    // Get payroll run
    const payrollRun = await prisma.payrollRun.findUnique({
      where: { id: parseInt(payrollRunId) },
      include: {
        calendar: true,
        customer: true,
      },
    });

    if (!payrollRun) {
      return NextResponse.json(
        { error: 'Payroll run not found' },
        { status: 404 }
      );
    }

    // Get employees to process
    let employeesToProcess;
    if (employeeIds && employeeIds.length > 0) {
      employeesToProcess = await prisma.employee.findMany({
        where: {
          id: { in: employeeIds },
          isActive: true,
        },
      });
    } else {
      employeesToProcess = await prisma.employee.findMany({
        where: {
          customerId: payrollRun.customerId,
          isActive: true,
        },
      });
    }

    // Get statutory deductions
    const statutoryDeductions = await prisma.statutoryDeduction.findMany({
      where: { isActive: true },
    });

    const results = [];

    for (const employee of employeesToProcess) {
      const employeeEarnings = [];
      const employeeDeductions = [];

      // 1. Add base salary
      let baseSalary = employee.baseSalary;
      
      // Prorate for partial periods if needed
      const daysInPeriod = Math.ceil(
        (new Date(payrollRun.payTo).getTime() - new Date(payrollRun.payFrom).getTime()) / 
        (1000 * 60 * 60 * 24)
      ) + 1;
      
      if (employee.salaryFrequency === 'monthly' && daysInPeriod < 30) {
        baseSalary = (baseSalary / 30) * daysInPeriod;
      }

      employeeEarnings.push({
        payrollRunId: payrollRun.id,
        employeeId: employee.id,
        earningCode: 'SALARIO',
        description: 'Salario Base',
        quantity: 1,
        unitAmount: baseSalary,
        totalAmount: baseSalary,
        isTaxable: true,
      });

      // 2. Process provided earnings (overtime, bonuses, etc.)
      const providedEarnings = earnings?.filter((e: any) => e.employeeId === employee.id) || [];
      for (const earning of providedEarnings) {
        employeeEarnings.push({
          payrollRunId: payrollRun.id,
          employeeId: employee.id,
          earningCode: earning.code,
          description: earning.description,
          quantity: earning.quantity || 1,
          unitAmount: earning.unitAmount,
          totalAmount: earning.quantity * earning.unitAmount,
          isTaxable: earning.isTaxable !== false,
        });
      }

      // 3. Calculate overtime if provided
      const overtimeData = providedEarnings.filter((e: any) => e.isOvertime);
      if (overtimeData.length > 0) {
        const overtimeResults = await calculateOvertime(
          employee.id,
          overtimeData.map((o: any) => ({ type: o.overtimeType, hours: o.quantity })),
          prisma
        );
        for (const ot of overtimeResults) {
          employeeEarnings.push({
            payrollRunId: payrollRun.id,
            employeeId: employee.id,
            earningCode: ot.code,
            description: ot.description,
            quantity: 1,
            unitAmount: ot.amount,
            totalAmount: ot.amount,
            isTaxable: true,
          });
        }
      }

      // 4. Calculate XIII Month (April, August, December)
      const currentMonth = new Date(payrollRun.payTo).getMonth();
      if ([3, 7, 11].includes(currentMonth)) { // April, August, December
        const xiiiAmount = await calculateXIIIMonth(employee.id, payrollRun.id, prisma);
        if (xiiiAmount > 0) {
          employeeEarnings.push({
            payrollRunId: payrollRun.id,
            employeeId: employee.id,
            earningCode: 'XIII_MES',
            description: 'Décimo Tercer Mes',
            quantity: 1,
            unitAmount: xiiiAmount,
            totalAmount: xiiiAmount,
            isTaxable: true,
          });

          // Record accrual
          await prisma.accrual13thMonth.create({
            data: {
              employeeId: employee.id,
              payrollRunId: payrollRun.id,
              amountAccrued: xiiiAmount,
              periodYear: new Date().getFullYear(),
              periodQuarter: Math.floor(currentMonth / 3) + 1,
            },
          });
        }
      }

      // Calculate gross pay
      const grossPay = employeeEarnings.reduce((sum, e) => sum + e.totalAmount, 0);

      // 5. Calculate statutory deductions
      for (const stat of statutoryDeductions) {
        let deductionAmount = 0;
        
        if (stat.code === 'CSS') {
          deductionAmount = grossPay * (stat.employeeRate || 0.0975);
        } else if (stat.code === 'SEGURO_EDUCATIVO') {
          deductionAmount = grossPay * (stat.employeeRate || 0.015);
        }

        if (deductionAmount > 0) {
          employeeDeductions.push({
            payrollRunId: payrollRun.id,
            employeeId: employee.id,
            deductionCode: stat.code,
            description: stat.description,
            amount: Math.round(deductionAmount * 100) / 100,
            isStatutory: true,
          });
        }
      }

      // 6. Calculate ISR
      // Annualize the income for ISR calculation
      const periodsPerYear = employee.salaryFrequency === 'monthly' ? 12 : 
                            employee.salaryFrequency === 'biweekly' ? 24 : 52;
      const annualizedIncome = grossPay * periodsPerYear;
      const periodISR = await calculateISR(annualizedIncome, prisma);

      if (periodISR > 0) {
        employeeDeductions.push({
          payrollRunId: payrollRun.id,
          employeeId: employee.id,
          deductionCode: 'ISR',
          description: 'Impuesto Sobre la Renta',
          amount: periodISR,
          isStatutory: true,
        });
      }

      // 7. Process provided deductions
      const providedDeductions = deductions?.filter((d: any) => d.employeeId === employee.id) || [];
      for (const deduction of providedDeductions) {
        employeeDeductions.push({
          payrollRunId: payrollRun.id,
          employeeId: employee.id,
          deductionCode: deduction.code,
          description: deduction.description,
          amount: parseFloat(deduction.amount),
          isStatutory: false,
        });
      }

      // Calculate net pay
      const totalDeductions = employeeDeductions.reduce((sum, d) => sum + d.amount, 0);
      const netPay = grossPay - totalDeductions;

      results.push({
        employee,
        grossPay: Math.round(grossPay * 100) / 100,
        deductions: employeeDeductions,
        totalDeductions: Math.round(totalDeductions * 100) / 100,
        netPay: Math.round(netPay * 100) / 100,
        earnings: employeeEarnings,
      });
    }

    return NextResponse.json({
      success: true,
      data: results,
      message: `Calculated payroll for ${results.length} employees`,
    });
  } catch (error) {
    console.error('Error calculating payroll:', error);
    return NextResponse.json(
      { error: 'Failed to calculate payroll' },
      { status: 500 }
    );
  }
}