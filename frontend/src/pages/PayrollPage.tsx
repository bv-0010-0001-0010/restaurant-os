import { useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { formatCents } from '../lib/money';
import { POSITION_LABELS } from '../types';
import type { PreviewResponse } from '../types/payroll';
import { startOfWeek, addDays } from '../lib/date';

// Default the period to last week (Mon–Sun).
function defaultPeriod() {
  const thisMonday = startOfWeek(new Date());
  const lastMonday = addDays(thisMonday, -7);
  const lastSunday = addDays(thisMonday, -1);
  return {
    from: lastMonday.toISOString().slice(0, 10),
    to: lastSunday.toISOString().slice(0, 10),
  };
}

export function PayrollPage() {
  const { user } = useAuth();
  const isOwner = user?.role === 'OWNER';

  const period = defaultPeriod();
  const [from, setFrom] = useState(period.from);
  const [to, setTo] = useState(period.to);
  const [taxRate, setTaxRate] = useState(15);
  const [superRate, setSuperRate] = useState(11.5);

  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [error, setError] = useState('');
  const [committed, setCommitted] = useState(false);

  // Build ISO datetimes covering the full days (start 00:00, end 23:59:59).
  function periodRange() {
    return {
      from: new Date(`${from}T00:00:00`).toISOString(),
      to: new Date(`${to}T23:59:59`).toISOString(),
    };
  }

  async function handlePreview() {
    setError('');
    setCommitted(false);
    setLoading(true);
    try {
      const res = await api.post<PreviewResponse>('/payroll/preview', {
        ...periodRange(),
        taxRatePct: taxRate,
        superRatePct: superRate,
      });
      setPreview(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not build preview');
    } finally {
      setLoading(false);
    }
  }

  async function handleCommit() {
    if (!preview) return;
    setCommitting(true);
    setError('');
    try {
      await api.post('/payroll/commit', {
        ...periodRange(),
        taxRatePct: taxRate,
        superRatePct: superRate,
      });
      setCommitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not commit pay run');
    } finally {
      setCommitting(false);
    }
  }

  return (
    <div>
      <h1 className="page-title">Payroll</h1>
      <p className="page-sub">
        Build a pay run from completed clock-ins for a period.
      </p>

      <div className="notice">
        Tax and super here are <strong>simplified estimates</strong>, not
        compliant Australian payroll figures. Verify against the relevant Fair
        Work award before making real payments.
      </div>

      <div className="card pay-controls">
        <div className="pay-control-row">
          <div className="field">
            <label>Period start</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Period end</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Tax % (est.)</label>
            <input
              type="number"
              value={taxRate}
              min={0}
              max={100}
              step={0.5}
              onChange={(e) => setTaxRate(Number(e.target.value))}
            />
          </div>
          <div className="field">
            <label>Super %</label>
            <input
              type="number"
              value={superRate}
              min={0}
              max={100}
              step={0.5}
              onChange={(e) => setSuperRate(Number(e.target.value))}
            />
          </div>
        </div>
        <button
          className="btn-primary btn-inline"
          onClick={handlePreview}
          disabled={loading}
        >
          {loading ? 'Calculating…' : 'Preview pay run'}
        </button>
      </div>

      {error && <div className="error-box">{error}</div>}
      {committed && (
        <div className="success-box">
          Pay run committed. Staff can now see their payslips.
        </div>
      )}

      {preview && (
        <>
          <div className="card" style={{ marginTop: 20 }}>
            <table>
              <thead>
                <tr>
                  <th>Staff</th>
                  <th>Position</th>
                  <th>Hours</th>
                  <th>Rate</th>
                  <th>Gross</th>
                  <th>Tax</th>
                  <th>Super</th>
                  <th>Net</th>
                </tr>
              </thead>
              <tbody>
                {preview.lines.map((l) => (
                  <tr key={l.userId}>
                    <td>{l.name}</td>
                    <td>{POSITION_LABELS[l.position]}</td>
                    <td>{l.hoursWorked.toFixed(2)}</td>
                    <td>{formatCents(l.hourlyRateCents)}</td>
                    <td>{formatCents(l.grossCents)}</td>
                    <td>{formatCents(l.taxCents)}</td>
                    <td>{formatCents(l.superCents)}</td>
                    <td>
                      <strong>{formatCents(l.netCents)}</strong>
                    </td>
                  </tr>
                ))}
                {preview.lines.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', color: '#6f655d' }}>
                      No completed hours in this period.
                    </td>
                  </tr>
                )}
              </tbody>
              {preview.lines.length > 0 && (
                <tfoot>
                  <tr className="pay-totals">
                    <td colSpan={2}>Totals</td>
                    <td>{preview.totals.hours.toFixed(2)}</td>
                    <td />
                    <td>{formatCents(preview.totals.grossCents)}</td>
                    <td>{formatCents(preview.totals.taxCents)}</td>
                    <td>{formatCents(preview.totals.superCents)}</td>
                    <td>
                      <strong>{formatCents(preview.totals.netCents)}</strong>
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {preview.lines.length > 0 && !committed && (
            <div className="pay-commit-row">
              {isOwner ? (
                <button
                  className="btn-primary btn-inline"
                  onClick={handleCommit}
                  disabled={committing}
                >
                  {committing ? 'Committing…' : 'Commit pay run'}
                </button>
              ) : (
                <p className="muted-note">
                  Only the owner can commit a pay run.
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
