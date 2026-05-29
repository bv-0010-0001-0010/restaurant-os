import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { AppLayout } from './components/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
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
            <Route
              path="/roster"
              element={
                <ModulePlaceholder
                  title="Roster"
                  description="Build and manage shift schedules."
                />
              }
            />
            <Route
              path="/clock"
              element={
                <ModulePlaceholder
                  title="Clock in / out"
                  description="Photo clock-in with timestamps."
                />
              }
            />
            <Route
              path="/reservations"
              element={
                <ProtectedRoute roles={['OWNER', 'MANAGER', 'FLOOR']}>
                  <ModulePlaceholder
                    title="Reservations"
                    description="Bookings, waitlist and guest profiles."
                  />
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
                  <ModulePlaceholder
                    title="Payroll"
                    description="Hours, pay rates and payslips."
                  />
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
