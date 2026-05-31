import { useEffect, useState } from 'react';
import { api } from '../api/client';
import {
  STATUS_LABELS,
  type Guest,
  type Reservation,
} from '../types/reservation';

interface Props {
  guestId: string;
  onClose: () => void;
}

function visitDate(iso: string): string {
  return new Date(iso).toLocaleDateString([], {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function GuestDrawer({ guestId, onClose }: Props) {
  const [guest, setGuest] = useState<Guest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Editable fields.
  const [dietary, setDietary] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api
      .get<{ guest: Guest }>(`/guests/${guestId}`)
      .then((res) => {
        setGuest(res.guest);
        setDietary(res.guest.dietaryNotes ?? '');
        setNotes(res.guest.notes ?? '');
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [guestId]);

  async function saveNotes() {
    setSaving(true);
    setSaved(false);
    try {
      await api.patch(`/guests/${guestId}`, {
        dietaryNotes: dietary,
        notes,
      });
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  }

  const history: Reservation[] = guest?.reservations ?? [];
  const completedVisits = history.filter(
    (r) => r.status === 'COMPLETED'
  ).length;

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div className="drawer" onClick={(e) => e.stopPropagation()}>
        <button className="drawer-close" onClick={onClose}>
          ×
        </button>

        {loading ? (
          <div className="placeholder">Loading…</div>
        ) : error ? (
          <div className="error-box">{error}</div>
        ) : guest ? (
          <>
            <h2 className="drawer-name">
              {guest.firstName} {guest.lastName}
            </h2>
            <div className="drawer-contact">
              {guest.phone && <span>{guest.phone}</span>}
              {guest.email && <span>{guest.email}</span>}
            </div>

            <div className="drawer-stat">
              <span className="badge badge-active">
                {completedVisits} completed visit
                {completedVisits === 1 ? '' : 's'}
              </span>
            </div>

            <div className="field">
              <label>Dietary notes</label>
              <input
                value={dietary}
                onChange={(e) => {
                  setDietary(e.target.value);
                  setSaved(false);
                }}
                placeholder="Allergies, requirements…"
              />
            </div>
            <div className="field">
              <label>General notes</label>
              <input
                value={notes}
                onChange={(e) => {
                  setNotes(e.target.value);
                  setSaved(false);
                }}
                placeholder="Regular, VIP, seating preference…"
              />
            </div>
            <button
              className="btn-primary btn-inline"
              onClick={saveNotes}
              disabled={saving}
            >
              {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save notes'}
            </button>

            <h3 className="drawer-section">Visit history</h3>
            {history.length === 0 ? (
              <p className="muted-note">No bookings yet.</p>
            ) : (
              <div className="visit-list">
                {history.map((r) => (
                  <div key={r.id} className="visit-row">
                    <span>{visitDate(r.startsAt)}</span>
                    <span className="visit-party">Party of {r.partySize}</span>
                    <span className="visit-status">
                      {STATUS_LABELS[r.status]}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}
