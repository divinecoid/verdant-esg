import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { canAccess, useAuth, type Role } from './auth/AuthContext';
import Layout from './components/Layout';
import { navItems } from './nav';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AuditTrail from './pages/AuditTrail';
import ComingSoon from './pages/ComingSoon';
import MasterData from './pages/MasterData';
import MetricsManagement from './pages/MetricsManagement';
import DataRequests from './pages/DataRequests';
import DataRequestDetail from './pages/DataRequestDetail';
import TaskInbox from './pages/TaskInbox';
import { Calculation, CalculationDetail } from './pages/Calculation';
import OutputReport from './pages/OutputReport';
import MinutesOfMeeting from './pages/MinutesOfMeeting';
import Registers from './pages/Registers';
import Companies from './pages/Companies';
import Configuration from './pages/Configuration';

function RequireAuth() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="p-6 text-sm text-neutral-500">Loading…</div>;
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  return <Layout />;
}

function RequireRole({ roles, children }: { roles?: Role[]; children: React.ReactNode }) {
  const { user } = useAuth();
  return canAccess(user, roles) ? <>{children}</> : <Navigate to="/" replace />;
}

const implemented: Record<string, React.ReactNode> = {
  '/': <Dashboard />,
  '/minutes-of-meeting': <MinutesOfMeeting />,
  '/registers': <Registers />,
  '/audit-trail': <AuditTrail />,
  '/master-data': <MasterData />,
  '/metrics': <MetricsManagement />,
  '/calculation': <Calculation />,
  '/output-report': <OutputReport />,
  '/data-request': <DataRequests />,
  '/task-inbox': <TaskInbox />,
  '/companies': <Companies />,
  '/configuration': <Configuration />,
};

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<RequireAuth />}>
        {navItems.map((item) => (
          <Route
            key={item.path}
            path={item.path}
            element={
              <RequireRole roles={item.roles}>
                {implemented[item.path] ?? <ComingSoon title={item.label} phase={item.phase} />}
              </RequireRole>
            }
          />
        ))}
        <Route
          path="/calculation/:id"
          element={
            <RequireRole roles={['ESG_TEAM', 'VIEWER']}>
              <CalculationDetail />
            </RequireRole>
          }
        />
        <Route
          path="/data-request/:id"
          element={
            <RequireRole roles={['ESG_TEAM', 'INVESTEE', 'VIEWER']}>
              <DataRequestDetail />
            </RequireRole>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
