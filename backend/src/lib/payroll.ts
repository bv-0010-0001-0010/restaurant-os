// ── Payroll calculation engine ──────────────────────────────────
//
// ⚠️  SIMPLIFIED — NOT COMPLIANT AUSTRALIAN PAYROLL  ⚠️
//
// This computes gross pay correctly (hours × rate), but tax and super use
// flat percentages, NOT real PAYG withholding tables or award penalty
// rates. Before paying anyone for real, either:
//   (a) replace these with the correct Fair Work award logic, or
//   (b) feed gross/hours into dedicated payroll software (Xero, KeyPay,
//       MYOB) via their APIs and let them handle tax + super.
//
// Everything here is deliberately pure (no DB, no I/O) so it's easy to
// test and swap out.

// Default flat rates. The Australian super guarantee is a real figure
// (11.5% for 2024–25), so that default is reasonable. The tax default is
// a placeholder — real PAYG depends on income, tax-free threshold, etc.
export const DEFAULT_TAX_RATE_PCT = 15; // placeholder estimate only
export const DEFAULT_SUPER_RATE_PCT = 11.5; // AU super guarantee 2024–25

export interface PayslipCalc {
  hoursWorked: number;
  hourlyRateCents: number;
  grossCents: number;
  taxCents: number;
  superCents: number;
  netCents: number;
}

// Computes a single payslip from hours + rate + the run's flat rates.
// Super is calculated on top of gross (employer contribution), matching
// how the super guarantee actually works — it isn't deducted from net.
export function calcPayslip(
  hoursWorked: number,
  hourlyRateCents: number,
  taxRatePct: number,
  superRatePct: number
): PayslipCalc {
  const grossCents = Math.round(hoursWorked * hourlyRateCents);
  const taxCents = Math.round(grossCents * (taxRatePct / 100));
  const superCents = Math.round(grossCents * (superRatePct / 100));
  const netCents = grossCents - taxCents;
  return {
    hoursWorked: Math.round(hoursWorked * 100) / 100,
    hourlyRateCents,
    grossCents,
    taxCents,
    superCents,
    netCents,
  };
}

// Hours between two timestamps, rounded to 2 decimals.
export function hoursBetween(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime();
  return Math.round((ms / (1000 * 60 * 60)) * 100) / 100;
}
