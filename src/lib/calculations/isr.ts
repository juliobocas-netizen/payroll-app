// src/lib/calculations/isr.ts

/**
 * Panamanian Impuesto Sobre la Renta (ISR) Calculation
 * 
 * Panama uses an annualized bracket system.
 * 1. Annualize the current period's base salary + taxable allowances.
 * 2. Deduct the annual standard deduction (e.g., $11,000 exempt, and dependent deductions if applicable).
 * 3. Deduct annual estimated CSS and Seguro Educativo.
 * 4. Apply the tax brackets to the remaining taxable income.
 * 5. De-annualize (divide by pay periods) to get the period deduction.
 */

export interface IsrBracket {
  rangeMin: number;
  rangeMax: number | null;
  rate: number; // e.g., 0.15 for 15%
  fixedAmount: number;
}

// Panama's ISR tax brackets (2024 rates)
export const DEFAULT_ISR_BRACKETS: IsrBracket[] = [
  { rangeMin: 0, rangeMax: 11000, rate: 0, fixedAmount: 0 },
  { rangeMin: 11000, rangeMax: 15000, rate: 0.10, fixedAmount: 0 },
  { rangeMin: 15000, rangeMax: 25000, rate: 0.15, fixedAmount: 400 },
  { rangeMin: 25000, rangeMax: 35000, rate: 0.20, fixedAmount: 1900 },
  { rangeMin: 35000, rangeMax: 45000, rate: 0.25, fixedAmount: 3900 },
  { rangeMin: 45000, rangeMax: 60000, rate: 0.30, fixedAmount: 6400 },
  { rangeMin: 60000, rangeMax: 120000, rate: 0.35, fixedAmount: 10900 },
  { rangeMin: 120000, rangeMax: null, rate: 0.40, fixedAmount: 31900 },
];

// Standard deduction (exento)
export const ANNUAL_EXEMPTION = 11000;

// CSS employee rate (2024)
export const CSS_EMPLOYEE_RATE = 0.0975; // 9.75%

// Seguro Educativo employee rate
export const SEGURO_EDUCATIVO_RATE = 0.015; // 1.5%

export function calculatePeriodISR(
  periodTaxableGross: number,
  payPeriodsPerYear: number = 12,
  brackets: IsrBracket[] = DEFAULT_ISR_BRACKETS,
  periodCssDeduction: number = 0,
  periodEducativoDeduction: number = 0
): number {
  // 1. Annualize income
  const annualizedGross = periodTaxableGross * payPeriodsPerYear;
  
  // 2. Apply statutory deductions (CSS, SE) annually
  const annualizedDeductions = (periodCssDeduction + periodEducativoDeduction) * payPeriodsPerYear;
  
  // 3. Calculate Net Taxable Income
  const netTaxableIncome = annualizedGross - annualizedDeductions;
  
  // 4. If income is below the minimum exempt bracket, tax is 0.
  if (netTaxableIncome <= ANNUAL_EXEMPTION) {
    return 0;
  }

  // 5. Apply Brackets using progressive calculation
  let annualTax = 0;
  
  // Sort brackets by minimum range to ensure proper calculation
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

  // 6. Return the period's portion (rounded to 2 decimals)
  return Math.round(annualTax / payPeriodsPerYear * 100) / 100;
}

/**
 * Calculate CSS (Caja de Seguro Social) deduction
 */
export function calculateCSS(grossPay: number, employeeRate: number = CSS_EMPLOYEE_RATE): number {
  // CSS has a cap (2024: maximum insurable salary is B/. 4,000 monthly)
  const CSS_CAP = 4000;
  const taxableBase = Math.min(grossPay, CSS_CAP);
  return Math.round(taxableBase * employeeRate * 100) / 100;
}

/**
 * Calculate Seguro Educativo deduction
 */
export function calculateSeguroEducativo(grossPay: number, rate: number = SEGURO_EDUCATIVO_RATE): number {
  const SEGURO_CAP = 4000; // Same cap as CSS
  const taxableBase = Math.min(grossPay, SEGURO_CAP);
  return Math.round(taxableBase * rate * 100) / 100;
}
