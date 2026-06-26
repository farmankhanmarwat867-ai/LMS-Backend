import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { selectTheme } from '../app/authSlice';
import AuthLayout from '../layouts/AuthLayout';
import DashboardLayout from '../layouts/DashboardLayout';
import RequireAuth from './RequireAuth';

// Lazy loading / direct imports of features
import LoginPage from '../features/auth/LoginPage';
import ResetPasswordPage from '../features/auth/ResetPasswordPage';
import LandingPage from '../features/landing/LandingPage';
import ProfilePage from '../features/profile/ProfilePage';
import DashboardPage from '../features/dashboard/DashboardPage';
import PlansPage from '../features/plans/PlansPage';
import InstitutesPage from '../features/institutes/InstitutesPage';
import BranchesPage from '../features/branches/BranchesPage';
import SessionsPage from '../features/academicSessions/SessionsPage';
import ClassesPage from '../features/classes/ClassesPage';
import SectionsPage from '../features/sections/SectionsPage';
import SubjectsPage from '../features/subjects/SubjectsPage';
import UsersPage from '../features/users/UsersPage';
import CoursesPage from '../features/courses/CoursesPage';
import IdCardModule from '../features/idCards/IdCardModule';
import EnrollmentsPage from '../features/enrollments/EnrollmentsPage';
import AssignmentsPage from '../features/assignments/AssignmentsPage';
import AttendancePage from '../features/attendance/AttendancePage';
import DailyAttendanceReport from '../features/attendance/DailyAttendanceReport';
import QrAttendancePage from '../features/qrAttendance/QrAttendancePage';
import GateScannerScreen from '../features/qrAttendance/GateScannerScreen';
import ExamsPage from '../features/exams/ExamsPage';
import ResultsPage from '../features/results/ResultsPage';
import ReportCardsPage from '../features/reportCards/ReportCardsPage';
import FeesPage from '../features/fees/FeesPage';
import NotificationsPage from '../features/notifications/NotificationsPage';
import ParentPortalPage from '../features/parentPortal/ParentPortalPage';
import AuditLogsPage from '../features/auditLogs/AuditLogsPage';
import SettingsPage from '../features/settings/SettingsPage';
import CertificatesPage from '../features/certificates/CertificatesPage';

export default function AppRoutes() {
  const theme = useSelector(selectTheme);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<LandingPage />} />
      
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
      </Route>

      {/* Error Routes */}
      <Route path="/403" element={
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950 p-6 text-center">
          <h1 className="text-9xl font-black text-primary/10">403</h1>
          <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-4">Access Forbidden</p>
          <p className="text-slate-500 dark:text-slate-400 mt-2">You do not have the required permissions to view this resource.</p>
        </div>
      } />
      <Route path="*" element={
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950 p-6 text-center">
          <h1 className="text-9xl font-black text-primary/10">404</h1>
          <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-4">Page Not Found</p>
          <p className="text-slate-500 dark:text-slate-400 mt-2">The page you are looking for does not exist or has been moved.</p>
        </div>
      } />

      {/* Protected Routes */}
      <Route element={<RequireAuth />}>
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/notifications" element={<NotificationsPage />} />

          {/* Super Admin Only */}
          <Route element={<RequireAuth allowedRoles={['SUPER_ADMIN']} />}>
            <Route path="/plans" element={<PlansPage />} />
            <Route path="/institutes" element={<InstitutesPage />} />
            <Route path="/audit-logs" element={<AuditLogsPage />} />
          </Route>

          {/* Institute Admin Only */}
          <Route element={<RequireAuth allowedRoles={['INSTITUTE_ADMIN']} />}>
            <Route path="/branches" element={<BranchesPage />} />
            <Route path="/sessions" element={<SessionsPage />} />
          </Route>

          {/* Shared Admin/Branch/Teacher/Student Routes */}
          <Route path="/classes" element={<ClassesPage />} />
          <Route path="/sections" element={<SectionsPage />} />
          <Route path="/subjects" element={<SubjectsPage />} />
          
          <Route element={<RequireAuth allowedRoles={['SUPER_ADMIN', 'INSTITUTE_ADMIN', 'BRANCH_ADMIN']} />}>
            <Route path="/users" element={<UsersPage />} />
            <Route path="/id-cards" element={<IdCardModule />} />
          </Route>

          <Route path="/enrollments" element={<EnrollmentsPage />} />
          <Route path="/courses" element={<CoursesPage />} />
          
          {/* Assignments */}
          <Route path="/assignments" element={<AssignmentsPage />} />

          {/* Attendance */}
          <Route path="/attendance" element={<AttendancePage />} />
          <Route path="/daily-attendance" element={<DailyAttendanceReport />} />
          <Route path="/qr-attendance" element={<QrAttendancePage />} />
          <Route path="/qr-attendance/scan" element={<QrAttendancePage scanMode />} />
          <Route path="/gate-scanner" element={<GateScannerScreen />} />

          {/* Exams, Results & Report Cards */}
          <Route path="/exams" element={<ExamsPage />} />
          <Route path="/results" element={<ResultsPage />} />
          <Route path="/report-cards" element={<ReportCardsPage />} />

          {/* Certificates & Transcripts */}
          <Route
            element={<RequireAuth allowedRoles={['SUPER_ADMIN', 'INSTITUTE_ADMIN', 'BRANCH_ADMIN', 'TEACHER']} />}
          >
            <Route path="/certificates" element={<CertificatesPage />} />
          </Route>

          {/* Fee Modules */}
          <Route path="/fees" element={<FeesPage />} />

          {/* Parent Portal */}
          <Route element={<RequireAuth allowedRoles={['PARENT']} />}>
            <Route path="/parent-portal/*" element={<ParentPortalPage />} />
          </Route>

          {/* Settings */}
          <Route element={<RequireAuth allowedRoles={['SUPER_ADMIN', 'INSTITUTE_ADMIN', 'BRANCH_ADMIN']} />}>
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  );
}
