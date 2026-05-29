import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { navForRole } from '../auth/nav';
import { ROLE_LABELS, POSITION_LABELS } from '../types';

export function AppLayout() {
  const { user, logout } = useAuth();
  if (!user) return null;

  const items = navForRole(user.role);
  const initials = `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`;

  // Floor staff get their specific position shown (Bar / Waitstaff).
  const roleLabel =
    user.role === 'FLOOR'
      ? POSITION_LABELS[user.position]
      : ROLE_LABELS[user.role];

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          Restaurant<span className="brand-mark">OS</span>
        </div>

        <nav>
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                isActive ? 'nav-link active' : 'nav-link'
              }
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-foot">
          <div className="user-chip">
            <div className="avatar">{initials.toUpperCase()}</div>
            <div>
              <div className="user-name">
                {user.firstName} {user.lastName}
              </div>
              <div className="user-role">{roleLabel}</div>
            </div>
          </div>
          <button className="logout-btn" onClick={logout}>
            Sign out
          </button>
        </div>
      </aside>

      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
