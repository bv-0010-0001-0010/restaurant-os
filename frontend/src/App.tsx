import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { AppLayout } from './components/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { RosterPage } from './pages/RosterPage';
import { ClockPage } from './pages/ClockPage';
import { TimesheetsPage } from './pages/TimesheetsPage';
import { PayrollPage } from './pages/PayrollPage';
import { PayslipsPage } from './pages/PayslipsPage';
import { ReservationsPage } from './pages/ReservationsPage';
import { StaffPage } from './pages/StaffPage';
import { ModulePlaceholder } from './pages/ModulePlaceholder';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<DashboardPage />} />
            <Route path="/roster" element={<RosterPage />} />
            <Route path="/clock" element={<ClockPage />} />
            <Route
              path="/timesheets"
              element={
                <ProtectedRoute roles={['OWNER', 'MANAGER']}>
                  <TimesheetsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reservations"
              element={
                <ProtectedRoute roles={['OWNER', 'MANAGER', 'FLOOR']}>
                  <ReservationsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tables"
              element={
                <ModulePlaceholder
                  title="Tables"
                  description="Live floor plan and table status."
                />
              }
            />
            <Route
              path="/payroll"
              element={
                <ProtectedRoute roles={['OWNER', 'MANAGER']}>
                  <PayrollPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/payslips"
              element={
                <ProtectedRoute roles={['KITCHEN', 'FLOOR']}>
                  <PayslipsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports"
              element={
                <ProtectedRoute roles={['OWNER', 'MANAGER']}>
                  <ModulePlaceholder
                    title="Square reports"
                    description="Sales and reporting from your Square account."
                  />
                </ProtectedRoute>
              }
            />
            <Route
              path="/staff"
              element={
                <ProtectedRoute roles={['OWNER', 'MANAGER']}>
                  <StaffPage />
                </ProtectedRoute>
              }
            />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
