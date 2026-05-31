import type { Position } from './index';

export interface PayslipLine {
  userId: string;
  name: string;
  position: Position;
  hoursWorked: number;
  hourlyRateCents: number;
  grossCents: number;
  taxCents: number;
  superCents: number;
  netCents: number;
}

export interface PreviewTotals {
  grossCents: number;
  taxCents: number;
  superCents: number;
  netCents: number;
  hours: number;
}

export interface PreviewResponse {
  lines: PayslipLine[];
  totals: PreviewTotals;
  taxRatePct: number;
  superRatePct: number;
}

export interface SavedPayslip {
  id: string;
  hoursWorked: number;
  hourlyRateCents: number;
  grossCents: number;
  taxCents: number;
  superCents: number;
  netCents: number;
  payRun: {
    id: string;
    periodStart: string;
    periodEnd: string;
    taxRatePct: number;
    superRatePct: number;
  };
}
