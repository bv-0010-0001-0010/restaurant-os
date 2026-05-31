import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { CameraCapture } from '../components/CameraCapture';
import type { TimeEntry } from '../types/time';
import type { Shift } from '../types/shift';
import { timeLabel, hoursBetween } from '../lib/date';

interface StatusResponse {
  openEntry: TimeEntry | null;
  todayShift: Shift | null;
}

export function ClockPage() {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cameraFor, setCameraFor] = useState<'in' | 'out' | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [now, setNow] = useState(new Date());

  // Live clock so the on-shift timer ticks.
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  async function loadStatus() {
    try {
      const res = await api.get<StatusResponse>('/time/status');
      setStatus(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load status');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStatus();
  }, []);

  async function handleCapture(dataUrl: string) {
    const action = cameraFor;
    setCameraFor(null);
    setSubmitting(true);
    setError('');
    try {
      await api.post(`/time/clock-${action}`, { photo: dataUrl });
      await loadStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="placeholder">Loading…</div>;

  const open = status?.openEntry ?? null;
  const shift = status?.todayShift ?? null;
  const onShift = !!open;

  // Elapsed time since clock-in.
  let elapsed = '';
  if (open) {
    const mins = Math.floor(
      (now.getTime() - new Date(open.clockIn).getTime()) / 60000
    );
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    elapsed = `${h}h ${String(m).padStart(2, '0')}m`;
  }

  return (
    <div>
      <h1 className="page-title">Clock in / out</h1>
      <p className="page-sub">
        {onShift ? "You're on shift." : 'Take a photo to start your shift.'}
      </p>

      {error && <div className="error-box">{error}</div>}

      {cameraFor ? (
        <div className="card clock-card">
          <CameraCapture
            onCapture={handleCapture}
            onCancel={() => setCameraFor(null)}
          />
        </div>
      ) : (
        <div className="card clock-card">
          <div className={`clock-status ${onShift ? 'on' : 'off'}`}>
            <span className="clock-dot" />
            {onShift ? 'Clocked in' : 'Clocked out'}
          </div>

          {shift ? (
            <p className="clock-shift">
              Today's shift: {timeLabel(shift.startsAt)} –{' '}
              {timeLabel(shift.endsAt)} (
              {hoursBetween(shift.startsAt, shift.endsAt).toFixed(1)}h)
            </p>
          ) : (
            <p className="clock-shift muted">No shift scheduled for today.</p>
          )}

          {onShift && (
            <>
              <div className="clock-elapsed">{elapsed}</div>
              <p className="clock-since">
                since {timeLabel(open!.clockIn)}
                {open!.lateByMinutes != null && open!.lateByMinutes > 5 && (
                  <span className="late-tag">
                    {' '}
                    · {open!.lateByMinutes}m late
                  </span>
                )}
              </p>
            </>
          )}

          <button
            className={onShift ? 'btn-danger clock-btn' : 'btn-primary clock-btn'}
            onClick={() => setCameraFor(onShift ? 'out' : 'in')}
            disabled={submitting}
          >
            {submitting
              ? 'Saving…'
              : onShift
                ? 'Clock out'
                : 'Clock in'}
          </button>
        </div>
      )}
    </div>
  );
}
