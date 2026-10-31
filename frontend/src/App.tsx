import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './features/auth/AuthContext';
import Layout from './components/Layout';
import { ErrorBoundary } from './components/ErrorBoundary';

// High-Performance Code-Splitting: Lazy load route chunks on demand
const LoginPage = React.lazy(() => import('./features/auth/LoginPage'));
const Dashboard = React.lazy(() => import('./features/dashboard/Dashboard'));
const CreateTaskPage = React.lazy(() => import('./features/tasks/CreateTaskPage'));
const TaskListPage = React.lazy(() => import('./features/tasks/TaskListPage'));
const TaskDetailPage = React.lazy(() => import('./features/tasks/TaskDetailPage'));
const MyActionPage = React.lazy(() => import('./features/tasks/MyActionPage'));
const PendingWithOthersPage = React.lazy(() => import('./features/tasks/PendingWithOthersPage'));
const CollaborationsPage = React.lazy(() => import('./features/tasks/CollaborationsPage'));
const ReviewPage = React.lazy(() => import('./features/tasks/ReviewPage'));
const CompletedPage = React.lazy(() => import('./features/tasks/CompletedPage'));
const OnHoldPage = React.lazy(() => import('./features/tasks/OnHoldPage'));
const CancelledPage = React.lazy(() => import('./features/tasks/CancelledPage'));
const UsersPage = React.lazy(() => import('./features/users/UsersPage'));
const DepartmentsPage = React.lazy(() => import('./features/departments/DepartmentsPage'));
const NotificationsPage = React.lazy(() => import('./features/notifications/NotificationsPage'));
const ReportsPage = React.lazy(() => import('./features/reports/ReportsPage'));
const WorkLogsPage = React.lazy(() => import('./features/logs/WorkLogsPage'));
const ProfileSettingsPage = React.lazy(() => import('./features/profile/ProfileSettingsPage'));
const MessagesPage = React.lazy(() => import('./features/messages/MessagesPage'));

const PageLoader: React.FC = () => (
  <div className="flex-1 flex flex-col items-center justify-center p-12 min-h-[350px]">
    <div className="relative flex items-center justify-center mb-3">
      <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.4)] animate-pulse">
        <span className="font-black text-sm text-white">Q</span>
      </div>
      <div className="absolute -inset-1 rounded-2xl border border-cyan-400/30 animate-ping pointer-events-none" />
    </div>
    <p className="text-xs font-semibold text-slate-500">Loading view...</p>
  </div>
);

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#070b18] text-white">
        <div className="relative flex items-center justify-center mb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 flex items-center justify-center shadow-[0_0_25px_rgba(37,99,235,0.5)]">
            <span className="font-black text-lg">Q</span>
          </div>
          <div className="absolute -inset-1.5 rounded-2xl border border-cyan-400/30 animate-ping pointer-events-none" />
        </div>
        <p className="text-sm font-bold tracking-tight text-white">QuickLifeNow</p>
        <p className="text-[11px] text-slate-400 mt-0.5">Enterprise Management</p>
      </div>
    );
  }
  return isAuthenticated ? <Layout>{children}</Layout> : <Navigate to="/login" replace />;
};

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#070b18] text-white">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.5)] mb-3">
          <span className="font-black text-base">Q</span>
        </div>
        <p className="text-xs font-semibold text-slate-400">Loading...</p>
      </div>
    );
  }
  return !isAuthenticated ? <>{children}</> : <Navigate to="/" replace />;
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public Auth Routes */}
              <Route
                path="/login"
                element={
                  <PublicRoute>
                    <LoginPage />
                  </PublicRoute>
                }
              />

              {/* Protected Main Routes */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />

              {/* Task Workflow Routes */}
              <Route
                path="/tasks"
                element={
                  <ProtectedRoute>
                    <TaskListPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tasks/create"
                element={
                  <ProtectedRoute>
                    <CreateTaskPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tasks/my-action"
                element={
                  <ProtectedRoute>
                    <MyActionPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tasks/pending"
                element={
                  <ProtectedRoute>
                    <MyActionPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/pending"
                element={
                  <ProtectedRoute>
                    <MyActionPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tasks/pending-with-others"
                element={
                  <ProtectedRoute>
                    <PendingWithOthersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tasks/collaborations"
                element={
                  <ProtectedRoute>
                    <CollaborationsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tasks/review"
                element={
                  <ProtectedRoute>
                    <ReviewPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tasks/completed"
                element={
                  <ProtectedRoute>
                    <CompletedPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tasks/on-hold"
                element={
                  <ProtectedRoute>
                    <OnHoldPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tasks/cancelled"
                element={
                  <ProtectedRoute>
                    <CancelledPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tasks/:id"
                element={
                  <ProtectedRoute>
                    <TaskDetailPage />
                  </ProtectedRoute>
                }
              />

              {/* Management & Audit Routes */}
              <Route
                path="/users"
                element={
                  <ProtectedRoute>
                    <UsersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/departments"
                element={
                  <ProtectedRoute>
                    <DepartmentsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/notifications"
                element={
                  <ProtectedRoute>
                    <NotificationsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reports"
                element={
                  <ProtectedRoute>
                    <ReportsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/work-logs"
                element={
                  <ProtectedRoute>
                    <WorkLogsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/worklogs"
                element={
                  <ProtectedRoute>
                    <WorkLogsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/logs"
                element={
                  <ProtectedRoute>
                    <WorkLogsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/messages"
                element={
                  <ProtectedRoute>
                    <MessagesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <ProfileSettingsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <ProfileSettingsPage />
                  </ProtectedRoute>
                }
              />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default App;
