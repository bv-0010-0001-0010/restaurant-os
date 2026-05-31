import { useState, type FormEvent } from 'react';
import { api } from '../api/client';
import { POSITION_LABELS, type Position, type User } from '../types';
import type { Shift } from '../types/shift';
import { isoFromDateAndTime } from '../lib/date';

interface Props {
  day: Date;
  staff: User[];
  existing?: Shift; // present when editing
  onClose: () => void;
  onSaved: () => void;
}

const POSITIONS: Position[] = ['KITCHEN', 'BAR', 'WAIT', 'MANAGEMENT'];

// Pull "HH:MM" out of an ISO string for the time inputs.
function timeValue(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(
    d.getMinutes()
  ).padStart(2, '0')}`;
}

export function ShiftModal({ day, staff, existing, onClose, onSaved }: Props) {
  const [userId, setUserId] = useState(existing?.userId ?? staff[0]?.id ?? '');
  const [start, setStart] = useState(
    existing ? timeValue(existing.startsAt) : '09:00'
  );
  const [end, setEnd] = useState(existing ? timeValue(existing.endsAt) : '17:00');
  const [position, setPosition] = useState<Position>(
    existing?.position ?? staff[0]?.position ?? 'WAIT'
  );
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // When the selected staff member changes, default the position to theirs.
  function handleStaffChange(id: string) {
    setUserId(id);
    const member = staff.find((s) => s.id === id);
    if (member) setPosition(member.position);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    const body = {
      userId,
      startsAt: isoFromDateAndTime(day, start),
      endsAt: isoFromDateAndTime(day, end),
      position,
      notes: notes.trim() || undefined,
    };
    try {
      if (existing) {
        await api.patch(`/shifts/${existing.id}`, body);
      } else {
        await api.post('/shifts', body);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save shift');
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!existing) return;
    setBusy(true);
    try {
      await api.del(`/shifts/${existing.id}`);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete');
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">{existing ? 'Edit shift' : 'New shift'}</h2>

        {error && <div className="error-box">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Staff member</label>
            <select
              value={userId}
              onChange={(e) => handleStaffChange(e.target.value)}
            >
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.firstName} {s.lastName} · {POSITION_LABELS[s.position]}
                </option>
              ))}
            </select>
          </div>

          <div className="field-row">
            <div className="field">
              <label>Start</label>
              <input
                type="time"
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </div>
            <div className="field">
              <label>End</label>
              <input
                type="time"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
            </div>
          </div>

          <div className="field">
            <label>Working as</label>
            <select
              value={position}
              onChange={(e) => setPosition(e.target.value as Position)}
            >
              {POSITIONS.map((p) => (
                <option key={p} value={p}>
                  {POSITION_LABELS[p]}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>Notes (optional)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. covering the bar"
            />
          </div>

          <div className="modal-actions">
            {existing ? (
              <button
                type="button"
                className="btn-danger"
                onClick={handleDelete}
                disabled={busy}
              >
                Delete
              </button>
            ) : (
              <span />
            )}
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
                {busy ? 'Saving…' : 'Save shift'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
