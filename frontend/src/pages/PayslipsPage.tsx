import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { formatCents } from '../lib/money';
import type { SavedPayslip } from '../types/payroll';

function periodLabel(startIso: string, endIso: string): string {
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
  const s = new Date(startIso).toLocaleDateString([], opts);
  const e = new Date(endIso).toLocaleDateString([], opts);
  return `${s} – ${e}`;
}

export function PayslipsPage() {
  const [payslips, setPayslips] = useState<SavedPayslip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get<{ payslips: SavedPayslip[] }>('/payroll/my-payslips')
      .then((res) => setPayslips(res.payslips))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="placeholder">Loading payslips…</div>;

  return (
    <div>
      <h1 className="page-title">My payslips</h1>
      <p className="page-sub">Your pay history.</p>

      {error && <div className="error-box">{error}</div>}

      {payslips.length === 0 ? (
        <div className="placeholder">
          No payslips yet. They'll appear here once a pay run including your
          hours has been committed.
        </div>
      ) : (
        <div className="payslip-list">
          {payslips.map((p) => (
            <div key={p.id} className="payslip-card">
              <div className="payslip-head">
                <span className="payslip-period">
                  {periodLabel(p.payRun.periodStart, p.payRun.periodEnd)}
                </span>
                <span className="payslip-net">{formatCents(p.netCents)}</span>
              </div>
              <div className="payslip-rows">
                <div className="payslip-row">
                  <span>Hours worked</span>
                  <span>{p.hoursWorked.toFixed(2)}</span>
                </div>
                <div className="payslip-row">
                  <span>Hourly rate</span>
                  <span>{formatCents(p.hourlyRateCents)}</span>
                </div>
                <div className="payslip-row">
                  <span>Gross pay</span>
                  <span>{formatCents(p.grossCents)}</span>
                </div>
                <div className="payslip-row">
                  <span>Tax withheld (est.)</span>
                  <span>−{formatCents(p.taxCents)}</span>
                </div>
                <div className="payslip-row payslip-net-row">
                  <span>Net pay</span>
                  <span>{formatCents(p.netCents)}</span>
                </div>
                <div className="payslip-row payslip-super">
                  <span>Super (paid on top)</span>
                  <span>{formatCents(p.superCents)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
