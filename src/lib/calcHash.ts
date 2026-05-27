// Lightweight, deterministic hash utility for payroll calculation data
// Hashes the array of payroll calculation results (payrollData) to produce a stable string.

export function simpleHash(str: string): string {
  // FNV-1a 32-bit hash for simplicity
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  // Convert to unsigned 32-bit hex string
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function computeHashFromPayrollData(payrollData: any[]): string {
  // Normalize data for deterministic hashing
  const normalized = payrollData.map((p) => {
    const { id, employeeCode, employeeName, grossPay, css, isr, thirteenthMonth, netPay, hasException } = p;
    // Some fields may be missing; default to safe values
    return {
      id: id ?? 0,
      employeeCode: employeeCode ?? '',
      employeeName: employeeName ?? '',
      grossPay: typeof grossPay === 'number' ? grossPay : 0,
      css: typeof css === 'number' ? css : 0,
      isr: typeof isr === 'number' ? isr : 0,
      thirteenthMonth: typeof thirteenthMonth === 'number' ? thirteenthMonth : 0,
      netPay: typeof netPay === 'number' ? netPay : 0,
      hasException: !!hasException,
    };
  });
  const raw = JSON.stringify(normalized);
  return simpleHash(raw);
}

// Convenience: hash from full calculation state (may include more fields in the future)
export function computeHashFromCalculationState(payload: { payrollData: any[] }): string {
  return computeHashFromPayrollData(payload.payrollData || []);
}
