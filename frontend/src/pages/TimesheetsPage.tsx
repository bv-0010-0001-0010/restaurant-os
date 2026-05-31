import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { POSITION_LABELS } from '../types';
import type { TimeEntry } from '../types/time';
import { timeLabel, hoursBetween } from '../lib/date';

function fullName(e: TimeEntry): string {
  return e.user ? `${e.user.firstName} ${e.user.lastName}` : 'Unknown';
}

function entryHours(e: TimeEntry): string {
  if (!e.clockOut) return '—';
  return `${hoursBetween(e.clockIn, e.clockOut).toFixed(2)}h`;
}

function dateLabelShort(iso: string): string {
  return new Date(iso).toLocaleDateString([], {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export function TimesheetsPage() {
  const [onNow, setOnNow] = useState<TimeEntry[]>([]);
  const [log, setLog] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.get<{ entries: TimeEntry[] }>('/time/on-now'),
      api.get<{ entries: TimeEntry[] }>('/time/entries'),
    ])
      .then(([a, b]) => {
        setOnNow(a.entries);
        setLog(b.entries);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="placeholder">Loading timesheets…</div>;

  return (
    <div>
      <h1 className="page-title">Timesheets</h1>
      <p className="page-sub">Who's on now, and the full clock-in log.</p>

      {error && <div className="error-box">{error}</div>}

      <h2 className="section-title">On shift now ({onNow.length})</h2>
      {onNow.length === 0 ? (
        <div className="placeholder">Nobody is clocked in right now.</div>
      ) : (
        <div className="on-now-grid">
          {onNow.map((e) => (
            <div key={e.id} className="on-now-card">
              <button
                className="on-now-photo"
                onClick={() => setPhoto(e.clockInPhoto)}
                title="View clock-in photo"
              >
                <img src={e.clockInPhoto} alt="Clock-in" />
              </button>
              <div>
                <div className="on-now-name">{fullName(e)}</div>
                <div className="on-now-meta">
                  {e.user && POSITION_LABELS[e.user.position]} · since{' '}
                  {timeLabel(e.clockIn)}
                </div>
                {e.lateByMinutes != null && e.lateByMinutes > 5 && (
                  <span className="late-tag">{e.lateByMinutes}m late</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <h2 className="section-title">Recent log</h2>
      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Staff</th>
              <th>Date</th>
              <th>In</th>
              <th>Out</th>
              <th>Hours</th>
              <th>Status</th>
              <th>Photos</th>
            </tr>
          </thead>
          <tbody>
            {log.map((e) => (
              <tr key={e.id}>
                <td>{fullName(e)}</td>
                <td>{dateLabelShort(e.clockIn)}</td>
                <td>{timeLabel(e.clockIn)}</td>
                <td>{e.clockOut ? timeLabel(e.clockOut) : '—'}</td>
                <td>{entryHours(e)}</td>
                <td>
                  {e.lateByMinutes != null && e.lateByMinutes > 5 ? (
                    <span className="late-tag">{e.lateByMinutes}m late</span>
                  ) : e.clockOut ? (
                    <span className="badge">Complete</span>
                  ) : (
                    <span className="badge badge-active">On shift</span>
                  )}
                </td>
                <td>
                  <button
                    className="link-btn"
                    onClick={() => setPhoto(e.clockInPhoto)}
                  >
                    In
                  </button>
                  {e.clockOutPhoto && (
                    <>
                      {' / '}
                      <button
                        className="link-btn"
                        onClick={() => setPhoto(e.clockOutPhoto!)}
                      >
                        Out
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {log.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', color: '#6f655d' }}>
                  No clock-ins yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {photo && (
        <div className="modal-backdrop" onClick={() => setPhoto(null)}>
          <div className="photo-modal" onClick={(e) => e.stopPropagation()}>
            <img src={photo} alt="Clock photo" />
            <button className="btn-ghost" onClick={() => setPhoto(null)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
