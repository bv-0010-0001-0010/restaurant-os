import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { navForRole } from '../auth/nav';

// Short descriptions shown on each module card.
const MODULE_DESC: Record<string, string> = {
  '/roster': 'View and manage shift schedules.',
  '/clock': 'Clock in and out with a photo.',
  '/reservations': 'Bookings, waitlist and guest profiles.',
  '/tables': 'Live floor plan and table status.',
  '/payroll': 'Hours, pay rates and payslips.',
  '/reports': 'Sales and reports from Square.',
  '/staff': 'Add and manage team members.',
};

export function DashboardPage() {
  const { user } = useAuth();
  if (!user) return null;

  const isManagement = user.role === 'OWNER' || user.role === 'MANAGER';
  const modules = navForRole(user.role).filter((m) => m.to !== '/');

  return (
    <div>
      <h1 className="page-title">Good day, {user.firstName}</h1>
      <p className="page-sub">
        Here's your workspace. {isManagement
          ? 'You have full management access.'
          : 'Your shifts and tools are below.'}
      </p>

      {isManagement && (
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-label">On shift now</div>
            <div className="stat-value">—</div>
            <div className="stat-meta">Connects to clock-in module</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Covers today</div>
            <div className="stat-value">—</div>
            <div className="stat-meta">Connects to reservations</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Labour cost (wk)</div>
            <div className="stat-value">—</div>
            <div className="stat-meta">Connects to payroll</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Sales today</div>
            <div className="stat-value">—</div>
            <div className="stat-meta">Connects to Square</div>
          </div>
        </div>
      )}

      <div className="module-grid">
        {modules.map((m) => (
          <Link key={m.to} to={m.to} className="module-card">
            <div className="module-icon">{m.icon}</div>
            <div className="module-name">{m.label}</div>
            <div className="module-desc">{MODULE_DESC[m.to] ?? ''}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
