import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { ROLE_LABELS, POSITION_LABELS, type User } from '../types';

interface StaffRow extends User {
  hourlyRateCents: number;
  createdAt: string;
}

export function StaffPage() {
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get<{ users: StaffRow[] }>('/users')
      .then((res) => setStaff(res.users))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="page-title">Staff</h1>
      <p className="page-sub">Everyone on your team and their access level.</p>

      {error && <div className="error-box">{error}</div>}
      {loading ? (
        <div className="placeholder">Loading staff…</div>
      ) : (
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Position</th>
                <th>Rate / hr</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((s) => (
                <tr key={s.id}>
                  <td>
                    {s.firstName} {s.lastName}
                  </td>
                  <td>{s.email}</td>
                  <td>
                    <span className="badge">{ROLE_LABELS[s.role]}</span>
                  </td>
                  <td>{POSITION_LABELS[s.position]}</td>
                  <td>
                    {s.hourlyRateCents
                      ? `$${(s.hourlyRateCents / 100).toFixed(2)}`
                      : '—'}
                  </td>
                  <td>{s.isActive ? 'Active' : 'Inactive'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
