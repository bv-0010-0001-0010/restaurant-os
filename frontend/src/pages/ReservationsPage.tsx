import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import { BookingModal } from '../components/BookingModal';
import { GuestDrawer } from '../components/GuestDrawer';
import {
  STATUS_LABELS,
  NEXT_STATUS,
  type Reservation,
  type ReservationStatus,
} from '../types/reservation';
import { addDays, timeLabel } from '../lib/date';

const STATUS_CLASS: Record<ReservationStatus, string> = {
  PENDING: 'st-pending',
  CONFIRMED: 'st-confirmed',
  SEATED: 'st-seated',
  COMPLETED: 'st-completed',
  CANCELLED: 'st-cancelled',
  NO_SHOW: 'st-noshow',
};

function toDateInput(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function longDate(d: Date): string {
  return d.toLocaleDateString([], {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

export function ReservationsPage() {
  const [day, setDay] = useState(new Date());
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [covers, setCovers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Reservation | null>(null);
  const [guestId, setGuestId] = useState<string | null>(null);

  const dateStr = toDateInput(day);

  const load = useCallback(async () => {
    setError('');
    try {
      const res = await api.get<{ reservations: Reservation[]; covers: number }>(
        `/reservations?date=${dateStr}`
      );
      setReservations(res.reservations);
      setCovers(res.covers);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load bookings');
    } finally {
      setLoading(false);
    }
  }, [dateStr]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  async function changeStatus(r: Reservation, status: ReservationStatus) {
    try {
      await api.patch(`/reservations/${r.id}`, { status });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update');
    }
  }

  function openNew() {
    setEditing(null);
    setShowModal(true);
  }

  return (
    <div>
      <div className="roster-head">
        <div>
          <h1 className="page-title">Reservations</h1>
          <p className="page-sub">Bookings for the day.</p>
        </div>
        <button className="btn-primary btn-inline" onClick={openNew}>
          + New booking
        </button>
      </div>

      <div className="week-nav">
        <button className="btn-ghost" onClick={() => setDay(addDays(day, -1))}>
          ← Prev
        </button>
        <input
          type="date"
          className="date-pick"
          value={dateStr}
          onChange={(e) => setDay(new Date(`${e.target.value}T12:00:00`))}
        />
        <button className="btn-ghost" onClick={() => setDay(addDays(day, 1))}>
          Next →
        </button>
        <button className="btn-ghost" onClick={() => setDay(new Date())}>
          Today
        </button>
      </div>

      <div className="cover-summary">
        <span className="cover-date">{longDate(day)}</span>
        <span className="badge">{reservations.length} bookings</span>
        <span className="badge badge-active">{covers} covers</span>
      </div>

      {error && <div className="error-box">{error}</div>}

      {loading ? (
        <div className="placeholder">Loading bookings…</div>
      ) : reservations.length === 0 ? (
        <div className="placeholder">No bookings for this day yet.</div>
      ) : (
        <div className="booking-list">
          {reservations.map((r) => {
            const next = NEXT_STATUS[r.status];
            return (
              <div key={r.id} className="booking-row">
                <div className="booking-time">{timeLabel(r.startsAt)}</div>

                <div className="booking-main">
                  <button
                    className="booking-guest"
                    onClick={() => setGuestId(r.guestId)}
                    title="View guest profile"
                  >
                    {r.guest.firstName} {r.guest.lastName}
                  </button>
                  <div className="booking-meta">
                    Party of {r.partySize}
                    {r.guest.dietaryNotes && (
                      <span className="diet-flag">
                        ⚠ {r.guest.dietaryNotes}
                      </span>
                    )}
                  </div>
                  {r.notes && <div className="booking-note">{r.notes}</div>}
                </div>

                <div className="booking-actions">
                  <span className={`status-pill ${STATUS_CLASS[r.status]}`}>
                    {STATUS_LABELS[r.status]}
                  </span>
                  {next && (
                    <button
                      className="btn-ghost btn-sm"
                      onClick={() => changeStatus(r, next)}
                    >
                      → {STATUS_LABELS[next]}
                    </button>
                  )}
                  <button
                    className="btn-ghost btn-sm"
                    onClick={() => {
                      setEditing(r);
                      setShowModal(true);
                    }}
                  >
                    Edit
                  </button>
                  {r.status !== 'CANCELLED' &&
                    r.status !== 'COMPLETED' &&
                    r.status !== 'NO_SHOW' && (
                      <button
                        className="btn-ghost btn-sm danger-text"
                        onClick={() => changeStatus(r, 'NO_SHOW')}
                      >
                        No-show
                      </button>
                    )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <BookingModal
          day={day}
          existing={editing ?? undefined}
          onClose={() => setShowModal(false)}
          onSaved={() => {
            setShowModal(false);
            load();
          }}
        />
      )}

      {guestId && (
        <GuestDrawer guestId={guestId} onClose={() => setGuestId(null)} />
      )}
    </div>
  );
}
