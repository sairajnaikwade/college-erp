import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { useAuth } from '../hooks/useAuth';
import type { UserRole } from '../types';
import {
  LoginPage,
  StudentDashboard,
  StaffDashboard,
  AdminDashboard,
  ProfilePage,
  AttendancePage,
  StaffAttendancePage,
  QuizzesPage,
  QuizAttemptPage,
  QuizAnalyticsPage,
  TimetablePage,
  AssignmentsPage,
  NotesPage,
  NoticesPage,
  NotFoundPage,
  DepartmentsPage,
  ClassesPage,
  SubjectsPage,
  StudentsPage,
  StaffPage,
  MarksPage,
  ResultsPage,
  ReportsPage,
} from '../pages';

interface ProtectedRouteProps {
  allowedRole?: UserRole;
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRole, children }) => {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-50">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRole && user.role !== allowedRole) {
    // Redirect to user's assigned portal
    return <Navigate to={`/${user.role.toLowerCase()}/dashboard`} replace />;
  }

  return <>{children}</>;
};

export const AppRouter: React.FC = () => {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Root redirect */}
      <Route
        path="/"
        element={
          user ? (
            <Navigate to={`/${user.role.toLowerCase()}/dashboard`} replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* Auth */}
      <Route path="/login" element={<LoginPage />} />

      {/* Student Routes */}
      <Route
        path="/student"
        element={
          <ProtectedRoute allowedRole="STUDENT">
            <DashboardLayout role="STUDENT" />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/student/dashboard" replace />} />
        <Route path="dashboard" element={<StudentDashboard />} />
        <Route path="attendance" element={<AttendancePage />} />
        <Route path="timetable" element={<TimetablePage />} />
        <Route path="assignments" element={<AssignmentsPage />} />
        <Route path="notes" element={<NotesPage />} />
        <Route path="notices" element={<NoticesPage />} />
        <Route path="quizzes" element={<QuizzesPage />} />
        <Route path="quizzes/:quizId/attempt/:attemptId" element={<QuizAttemptPage />} />
        <Route path="results" element={<ResultsPage />} />
        <Route path="results/:subjectId" element={<ResultsPage />} />
        <Route path="marks" element={<ResultsPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>

      {/* Staff Routes */}
      <Route
        path="/staff"
        element={
          <ProtectedRoute allowedRole="STAFF">
            <DashboardLayout role="STAFF" />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/staff/dashboard" replace />} />
        <Route path="dashboard" element={<StaffDashboard />} />
        <Route path="attendance" element={<StaffAttendancePage />} />
        <Route path="timetable" element={<TimetablePage />} />
        <Route path="assignments" element={<AssignmentsPage />} />
        <Route path="notes" element={<NotesPage />} />
        <Route path="notices" element={<NoticesPage />} />
        <Route path="quizzes" element={<QuizzesPage />} />
        <Route path="quizzes/:id/analytics" element={<QuizAnalyticsPage />} />
        <Route path="marks" element={<MarksPage />} />
        <Route path="marks/components" element={<MarksPage />} />
        <Route path="results" element={<ResultsPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="reports/attendance" element={<ReportsPage />} />
        <Route path="reports/performance" element={<ReportsPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>

      {/* Admin Routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRole="ADMIN">
            <DashboardLayout role="ADMIN" />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="departments" element={<DepartmentsPage />} />
        <Route path="classes" element={<ClassesPage />} />
        <Route path="subjects" element={<SubjectsPage />} />
        <Route path="students" element={<StudentsPage />} />
        <Route path="staff" element={<StaffPage />} />
        <Route path="attendance" element={<AttendancePage />} />
        <Route path="assignments" element={<AssignmentsPage />} />
        <Route path="notes" element={<NotesPage />} />
        <Route path="notices" element={<NoticesPage />} />
        <Route path="timetable" element={<TimetablePage />} />
        <Route path="quizzes" element={<QuizzesPage />} />
        <Route path="quizzes/:id/analytics" element={<QuizAnalyticsPage />} />
        <Route path="marks" element={<MarksPage />} />
        <Route path="results" element={<ResultsPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="reports/department" element={<ReportsPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>

      {/* Direct profile fallback */}
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Navigate
              to={user ? `/${user.role.toLowerCase()}/profile` : '/login'}
              replace
            />
          </ProtectedRoute>
        }
      />

      {/* 404 Catch-All */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};
