import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { ShiftModal } from '../components/ShiftModal';
import { POSITION_LABELS, type User } from '../types';
import type { Shift } from '../types/shift';
import {
  startOfWeek,
  addDays,
  weekDays,
  weekRangeLabel,
  dayLabel,
  dateLabel,
  timeLabel,
  hoursBetween,
} from '../lib/date';

// Maps a position to a CSS class for the coloured shift chip.
const POSITION_CLASS: Record<string, string> = {
  KITCHEN: 'chip-kitchen',
  BAR: 'chip-bar',
  WAIT: 'chip-wait',
  MANAGEMENT: 'chip-mgmt',
};

export function RosterPage() {
  const { user } = useAuth();
  const isManager = user?.role === 'OWNER' || user?.role === 'MANAGER';

  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [staff, setStaff] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal state: which day we're adding to, or which shift we're editing.
  const [modalDay, setModalDay] = useState<Date | null>(null);
  const [editing, setEditing] = useState<Shift | null>(null);

  const days = useMemo(() => weekDays(weekStart), [weekStart]);
  const rangeFrom = weekStart.toISOString();
  const rangeTo = addDays(weekStart, 7).toISOString();

  const loadShifts = useCallback(async () => {
    setError('');
    try {
      const res = await api.get<{ shifts: Shift[] }>(
        `/shifts?from=${encodeURIComponent(rangeFrom)}&to=${encodeURIComponent(
          rangeTo
        )}`
      );
      setShifts(res.shifts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load roster');
    } finally {
      setLoading(false);
    }
  }, [rangeFrom, rangeTo]);

  useEffect(() => {
    setLoading(true);
    loadShifts();
  }, [loadShifts]);

  // Managers need the staff list to assign shifts.
  useEffect(() => {
    if (!isManager) return;
    api
      .get<{ users: User[] }>('/users')
      .then((res) => setStaff(res.users.filter((u) => u.isActive !== false)))
      .catch(() => {});
  }, [isManager]);

  function shiftsForDay(day: Date): Shift[] {
    const key = day.toDateString();
    return shifts
      .filter((s) => new Date(s.startsAt).toDateString() === key)
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  }

  const totalHours = shifts.reduce(
    (sum, s) => sum + hoursBetween(s.startsAt, s.endsAt),
    0
  );
  const hasDrafts = shifts.some((s) => !s.published);

  async function handlePublish() {
    try {
      await api.post('/shifts/publish', { from: rangeFrom, to: rangeTo });
      await loadShifts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not publish');
    }
  }

  function closeModal() {
    setModalDay(null);
    setEditing(null);
  }

  return (
    <div>
      <div className="roster-head">
        <div>
          <h1 className="page-title">Roster</h1>
          <p className="page-sub">
            {isManager
              ? 'Build the schedule, then publish it for staff.'
              : 'Your shifts for the week.'}
          </p>
        </div>
        {isManager && (
          <button
            className="btn-primary btn-inline"
            onClick={handlePublish}
            disabled={!hasDrafts}
            title={hasDrafts ? '' : 'No draft shifts to publish'}
          >
            {hasDrafts ? 'Publish week' : 'All published'}
          </button>
        )}
      </div>

      <div className="week-nav">
        <button
          className="btn-ghost"
          onClick={() => setWeekStart(addDays(weekStart, -7))}
        >
          ← Previous
        </button>
        <div className="week-label">{weekRangeLabel(weekStart)}</div>
        <button
          className="btn-ghost"
          onClick={() => setWeekStart(addDays(weekStart, 7))}
        >
          Next →
        </button>
        <button
          className="btn-ghost"
          onClick={() => setWeekStart(startOfWeek(new Date()))}
        >
          This week
        </button>
      </div>

      {error && <div className="error-box">{error}</div>}

      {loading ? (
        <div className="placeholder">Loading roster…</div>
      ) : (
        <>
          <div className="roster-grid">
            {days.map((day) => {
              const dayShifts = shiftsForDay(day);
              return (
                <div key={day.toISOString()} className="day-col">
                  <div className="day-head">
                    <span className="day-name">{dayLabel(day)}</span>
                    <span className="day-date">{dateLabel(day)}</span>
                  </div>

                  <div className="day-body">
                    {dayShifts.map((s) => (
                      <button
                        key={s.id}
                        className={`shift-chip ${
                          POSITION_CLASS[s.position]
                        } ${s.published ? '' : 'is-draft'}`}
                        onClick={() => isManager && setEditing(s)}
                        disabled={!isManager}
                      >
                        <span className="chip-time">
                          {timeLabel(s.startsAt)}–{timeLabel(s.endsAt)}
                        </span>
                        <span className="chip-name">
                          {isManager
                            ? `${s.user.firstName} ${s.user.lastName[0]}.`
                            : POSITION_LABELS[s.position]}
                        </span>
                        {!s.published && (
                          <span className="chip-draft">Draft</span>
                        )}
                      </button>
                    ))}

                    {isManager && (
                      <button
                        className="add-shift"
                        onClick={() => setModalDay(day)}
                      >
                        + Add
                      </button>
                    )}

                    {!isManager && dayShifts.length === 0 && (
                      <div className="day-empty">—</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="roster-foot">
            <span className="badge">
              {shifts.length} shift{shifts.length === 1 ? '' : 's'}
            </span>
            <span className="badge">{totalHours.toFixed(1)} hours total</span>
          </div>
        </>
      )}

      {(modalDay || editing) && isManager && (
        <ShiftModal
          day={editing ? new Date(editing.startsAt) : modalDay!}
          staff={staff}
          existing={editing ?? undefined}
          onClose={closeModal}
          onSaved={() => {
            closeModal();
            loadShifts();
          }}
        />
      )}
    </div>
  );
}
