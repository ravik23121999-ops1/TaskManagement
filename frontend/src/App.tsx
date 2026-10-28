import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './features/auth/AuthContext';
import LoginPage from './features/auth/LoginPage';
import Dashboard from './features/dashboard/Dashboard';
import CreateTaskPage from './features/tasks/CreateTaskPage';
import TaskListPage from './features/tasks/TaskListPage';
import TaskDetailPage from './features/tasks/TaskDetailPage';
import MyActionPage from './features/tasks/MyActionPage';
import PendingWithOthersPage from './features/tasks/PendingWithOthersPage';
import CollaborationsPage from './features/tasks/CollaborationsPage';
import ReviewPage from './features/tasks/ReviewPage';
import CompletedPage from './features/tasks/CompletedPage';
import OnHoldPage from './features/tasks/OnHoldPage';
import UsersPage from './features/users/UsersPage';
import DepartmentsPage from './features/departments/DepartmentsPage';
import NotificationsPage from './features/notifications/NotificationsPage';
import ReportsPage from './features/reports/ReportsPage';
import WorkLogsPage from './features/logs/WorkLogsPage';
import ProfileSettingsPage from './features/profile/ProfileSettingsPage';
import Layout from './components/Layout';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-400 text-xs">
        Loading QuickLifeNow...
      </div>
    );
  }
  return isAuthenticated ? <Layout>{children}</Layout> : <Navigate to="/login" replace />;
};

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-slate-400 text-xs">
        Loading...
      </div>
    );
  }
  return !isAuthenticated ? <>{children}</> : <Navigate to="/" replace />;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
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
            path="/tasks/:id"
            element={
              <ProtectedRoute>
                <TaskDetailPage />
              </ProtectedRoute>
            }
          />

          {/* Management Routes */}
          <Route
            path="/work-logs"
            element={
              <ProtectedRoute>
                <WorkLogsPage />
              </ProtectedRoute>
            }
          />
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
            path="/reports"
            element={
              <ProtectedRoute>
                <ReportsPage />
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
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
