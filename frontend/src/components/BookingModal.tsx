import { useState, useEffect, type FormEvent } from 'react';
import { api } from '../api/client';
import type { Guest, Reservation } from '../types/reservation';
import { isoFromDateAndTime } from '../lib/date';

interface Props {
  day: Date;
  existing?: Reservation;
  onClose: () => void;
  onSaved: () => void;
}

function timeValue(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(
    d.getMinutes()
  ).padStart(2, '0')}`;
}

export function BookingModal({ day, existing, onClose, onSaved }: Props) {
  const editing = !!existing;

  // Guest selection mode: pick an existing guest or enter a new one.
  const [mode, setMode] = useState<'existing' | 'new'>(
    editing ? 'existing' : 'new'
  );
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Guest[]>([]);
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(
    existing?.guest ?? null
  );

  // New-guest fields.
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [dietary, setDietary] = useState('');

  // Booking fields.
  const [time, setTime] = useState(
    existing ? timeValue(existing.startsAt) : '19:00'
  );
  const [partySize, setPartySize] = useState(existing?.partySize ?? 2);
  const [notes, setNotes] = useState(existing?.notes ?? '');

  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Debounced guest search.
  useEffect(() => {
    if (mode !== 'existing' || search.trim().length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(() => {
      api
        .get<{ guests: Guest[] }>(`/guests?q=${encodeURIComponent(search)}`)
        .then((res) => setResults(res.guests))
        .catch(() => {});
    }, 250);
    return () => clearTimeout(t);
  }, [search, mode]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);

    const startsAt = isoFromDateAndTime(day, time);

    try {
      if (editing) {
        await api.patch(`/reservations/${existing!.id}`, {
          startsAt,
          partySize,
          notes: notes.trim() || undefined,
        });
      } else {
        // Build the create payload depending on guest mode.
        const base = { startsAt, partySize, notes: notes.trim() || undefined };
        const payload =
          mode === 'existing'
            ? { ...base, guestId: selectedGuest?.id }
            : {
                ...base,
                newGuest: {
                  firstName,
                  lastName,
                  phone: phone.trim() || undefined,
                  dietaryNotes: dietary.trim() || undefined,
                },
              };

        if (mode === 'existing' && !selectedGuest) {
          setError('Pick a guest, or switch to "New guest"');
          setBusy(false);
          return;
        }
        await api.post('/reservations', payload);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save booking');
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">{editing ? 'Edit booking' : 'New booking'}</h2>

        {error && <div className="error-box">{error}</div>}

        <form onSubmit={handleSubmit}>
          {/* Guest section — only choosable when creating */}
          {!editing && (
            <>
              <div className="seg-toggle">
                <button
                  type="button"
                  className={mode === 'new' ? 'seg active' : 'seg'}
                  onClick={() => setMode('new')}
                >
                  New guest
                </button>
                <button
                  type="button"
                  className={mode === 'existing' ? 'seg active' : 'seg'}
                  onClick={() => setMode('existing')}
                >
                  Existing guest
                </button>
              </div>

              {mode === 'new' ? (
                <>
                  <div className="field-row">
                    <div className="field">
                      <label>First name</label>
                      <input
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="field">
                      <label>Last name</label>
                      <input
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="field">
                    <label>Phone (optional)</label>
                    <input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                  <div className="field">
                    <label>Dietary notes (optional)</label>
                    <input
                      value={dietary}
                      onChange={(e) => setDietary(e.target.value)}
                      placeholder="e.g. nut allergy, vegetarian"
                    />
                  </div>
                </>
              ) : (
                <div className="field">
                  <label>Find guest</label>
                  {selectedGuest ? (
                    <div className="guest-pill">
                      {selectedGuest.firstName} {selectedGuest.lastName}
                      {selectedGuest.phone && ` · ${selectedGuest.phone}`}
                      <button
                        type="button"
                        className="guest-pill-x"
                        onClick={() => setSelectedGuest(null)}
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <>
                      <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search name or phone…"
                      />
                      {results.length > 0 && (
                        <div className="guest-results">
                          {results.map((g) => (
                            <button
                              key={g.id}
                              type="button"
                              className="guest-result"
                              onClick={() => {
                                setSelectedGuest(g);
                                setResults([]);
                                setSearch('');
                              }}
                            >
                              {g.firstName} {g.lastName}
                              {g.phone && (
                                <span className="guest-result-phone">
                                  {g.phone}
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </>
          )}

          {editing && (
            <p className="editing-guest">
              {existing!.guest.firstName} {existing!.guest.lastName}
            </p>
          )}

          {/* Booking details */}
          <div className="field-row">
            <div className="field">
              <label>Time</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
            <div className="field">
              <label>Party size</label>
              <input
                type="number"
                min={1}
                max={100}
                value={partySize}
                onChange={(e) => setPartySize(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="field">
            <label>Booking notes (optional)</label>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. birthday, window table"
            />
          </div>

          <div className="modal-actions">
            <span />
            <div className="modal-actions-right">
              <button
                type="button"
                className="btn-ghost"
                onClick={onClose}
                disabled={busy}
              >
                Cancel
              </button>
              <button className="btn-primary btn-inline" disabled={busy}>
                {busy ? 'Saving…' : 'Save booking'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
