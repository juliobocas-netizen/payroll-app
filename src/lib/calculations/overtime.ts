// src/lib/calculations/overtime.ts

/**
 * Panamanian Overtime (Horas Extras) Calculation
 * 
 * Rules:
 * - Base Hourly Rate = Monthly Salary / Base Divisor (e.g., 240)
 * - Diurna (Daytime): Base * 1.25
 * - Nocturna (Nighttime): Base * 1.75
 * - Mixta (Mixed): Base * 1.50
 * - Rest Day (Día Libre): Base * 1.50
 * - Holiday (Día Nacional): Base * 2.50
 */

export interface OvertimeRule {
  baseHourDivisor: number;
  multiplierDiurna: number;
  multiplierNocturna: number;
  multiplierMixta: number;
  multiplierRestday: number;
  multiplierHoliday: number;
}

export interface TimeEntry {
  hours: number;
  type: 'regular' | 'diurna' | 'nocturna' | 'mixta' | 'restday' | 'holiday';
}

export function calculateOvertime(
  monthlySalary: number,
  timeEntries: TimeEntry[],
  rules: OvertimeRule
): {
  baseHourlyRate: number;
  overtimeEarnings: Array<{ code: string; hours: number; amount: number }>;
  totalOvertimeAmount: number;
} {
  const baseHourlyRate = monthlySalary / rules.baseHourDivisor;
  let totalOvertimeAmount = 0;
  const overtimeEarnings: Array<{ code: string; hours: number; amount: number }> = [];

  for (const entry of timeEntries) {
    if (entry.type === 'regular') continue;

    let multiplier = 1.0;
    let code = 'HE_';

    switch (entry.type) {
      case 'diurna':
        multiplier = rules.multiplierDiurna;
        code += 'DIURNA';
        break;
      case 'nocturna':
        multiplier = rules.multiplierNocturna;
        code += 'NOCTURNA';
        break;
      case 'mixta':
        multiplier = rules.multiplierMixta;
        code += 'MIXTA';
        break;
      case 'restday':
        multiplier = rules.multiplierRestday;
        code += 'DESCANSO';
        break;
      case 'holiday':
        multiplier = rules.multiplierHoliday;
        code += 'FERIADO';
        break;
    }

    const amount = entry.hours * baseHourlyRate * multiplier;
    totalOvertimeAmount += amount;

    overtimeEarnings.push({
      code,
      hours: entry.hours,
      amount: Number(amount.toFixed(2)) // Standard rounding for payroll
    });
  }

  return {
    baseHourlyRate: Number(baseHourlyRate.toFixed(4)),
    overtimeEarnings,
    totalOvertimeAmount: Number(totalOvertimeAmount.toFixed(2))
  };
}
