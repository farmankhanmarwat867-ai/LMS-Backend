import { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  logOut,
  selectCurrentUser,
  selectTenantContext
} from '../app/authSlice';
import { useTheme } from '../context/ThemeContext';
import {
  LayoutDashboard, Building2, Calendar, GraduationCap, BookOpen, Users,
  Wallet, ClipboardCheck, CalendarClock, QrCode, FileText, Award, History,
  Settings, LogOut, Bell, User, Sun, Moon, Menu, X, ChevronRight, BookMarked,
  IdCard, Scan, Monitor, MonitorSmartphone, Search
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useGetInstitutesQuery } from '../app/api/coreApiSlice';
import { motion, AnimatePresence } from 'framer-motion';
import PageTransition from '../components/common/PageTransition';

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  
  const user = useSelector(selectCurrentUser);
  const { theme, setTheme } = useTheme();
  const tenant = useSelector(selectTenantContext);
  
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const { data: institutesRes } = useGetInstitutesQuery(
    { _id: tenant?.instituteId },
    { skip: !tenant?.instituteId }
  );
  
  const currentInstitute = institutesRes?.data?.[0] || institutesRes?.data;

  const handleLogout = () => {
    dispatch(logOut());
    toast.success('Logged out successfully');
    navigate('/login');
  };

  const getMenuGroups = () => {
    const role = user?.role;
    const groups = [
      { name: 'OVERVIEW', links: [] },
      { name: 'SCHOOLS', links: [] },
      { name: 'ACADEMICS', links: [] },
      { name: 'SUBSCRIPTIONS', links: [] },
      { name: 'MONITORING', links: [] },
      { name: 'SYSTEM', links: [] },
    ];

    if (role !== 'PARENT') {
      groups[0].links.push({ name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard });
    } else {
      groups[0].links.push({ name: 'Parent Dashboard', path: '/parent-portal', icon: Users });
      groups[0].links.push({ name: 'My Children', path: '/parent-portal/children', icon: GraduationCap });
      groups[2].links.push({ name: 'Attendance Reports', path: '/parent-portal/attendance', icon: ClipboardCheck });
      groups[2].links.push({ name: 'Assignments & Submissions', path: '/parent-portal/assignments', icon: FileText });
      groups[2].links.push({ name: 'Results & Report Cards', path: '/parent-portal/results', icon: Award });
      groups[3].links.push({ name: 'Fee Invoices & Receipts', path: '/parent-portal/fees', icon: Wallet });
    }

    if (role === 'SUPER_ADMIN') {
      groups[3].links.push({ name: 'Subscription Plans', path: '/plans', icon: Wallet });
      groups[1].links.push({ name: 'Institutes', path: '/institutes', icon: Building2 });
      groups[4].links.push({ name: 'Audit Logs', path: '/audit-logs', icon: History });
      groups[5].links.push({ name: 'System Settings', path: '/settings', icon: Settings });
    }

    if (role === 'INSTITUTE_ADMIN') {
      groups[1].links.push({ name: 'Branches', path: '/branches', icon: Building2 });
      groups[2].links.push(
        { name: 'Academic Sessions', path: '/sessions', icon: Calendar },
        { name: 'Classes', path: '/classes', icon: GraduationCap },
        { name: 'Sections', path: '/sections', icon: ChevronRight },
        { name: 'Subjects', path: '/subjects', icon: BookOpen },
        { name: 'Enrollments', path: '/enrollments', icon: BookMarked },
        { name: 'Exams & Timetable', path: '/exams', icon: CalendarClock },
        { name: 'Results & Grading', path: '/results', icon: FileText },
        { name: 'Certificates & Transcripts', path: '/certificates', icon: Award }
      );
      groups[3].links.push({ name: 'Fee Configurations', path: '/fees', icon: Wallet });
      groups[5].links.push(
        { name: 'Users Directory', path: '/users', icon: Users },
        { name: 'Global Settings', path: '/settings', icon: Settings }
      );
    }

    if (role === 'BRANCH_ADMIN') {
      groups[2].links.push(
        { name: 'Classes', path: '/classes', icon: GraduationCap },
        { name: 'Sections', path: '/sections', icon: ChevronRight },
        { name: 'Subjects Directory', path: '/subjects', icon: BookOpen },
        { name: 'Student Enrollments', path: '/enrollments', icon: BookMarked },
        { name: 'Exam Schedules', path: '/exams', icon: CalendarClock },
        { name: 'Exam Results', path: '/results', icon: FileText },
        { name: 'Certificates & Transcripts', path: '/certificates', icon: Award }
      );
      groups[3].links.push({ name: 'Fee Invoices', path: '/fees', icon: Wallet });
      groups[4].links.push(
        { name: 'Student ID Cards', path: '/id-cards', icon: IdCard },
        { name: 'Gate Scanner', path: '/gate-scanner', icon: Scan },
        { name: 'Daily Gate Attendance', path: '/daily-attendance', icon: ClipboardCheck },
        { name: 'Class Attendance Sheets', path: '/attendance', icon: ClipboardCheck }
      );
      groups[5].links.push(
        { name: 'Branch Users', path: '/users', icon: Users },
        { name: 'Branch Settings', path: '/settings', icon: Settings }
      );
    }

    if (role === 'TEACHER') {
      groups[2].links.push(
        { name: 'My Subjects', path: '/courses', icon: BookOpen },
        { name: 'Student Attendance', path: '/attendance', icon: ClipboardCheck },
        { name: 'QR Attendance', path: '/qr-attendance', icon: QrCode },
        { name: 'Assignments & Work', path: '/assignments', icon: FileText },
        { name: 'Exam Results Entry', path: '/results', icon: Award },
        { name: 'Report Cards Creator', path: '/report-cards', icon: FileText }
      );
    }

    if (role === 'STUDENT') {
      groups[2].links.push(
        { name: 'My Subjects', path: '/courses', icon: BookOpen },
        { name: 'Class Assignments', path: '/assignments', icon: FileText },
        { name: 'My Attendance Logs', path: '/attendance', icon: ClipboardCheck },
        { name: 'QR Check-in', path: '/qr-attendance/scan', icon: QrCode },
        { name: 'My Exam Results', path: '/results', icon: Award },
        { name: 'My Report Card', path: '/report-cards', icon: FileText }
      );
      groups[3].links.push({ name: 'My Fees & Payments', path: '/fees', icon: Wallet });
    }

    return groups.filter(g => g.links.length > 0);
  };

  const getBreadcrumbs = () => {
    const paths = location.pathname.split('/').filter(Boolean);
    return (
      <div className="flex items-center text-xs text-muted-foreground gap-1 font-medium capitalize select-none">
        <span className="hover:text-primary cursor-pointer transition-colors" onClick={() => navigate('/dashboard')}>Home</span>
        {paths.map((p, idx) => (
          <span key={idx} className="flex items-center gap-1">
            <ChevronRight className="w-3.5 h-3.5" />
            <span className={idx === paths.length - 1 ? 'text-foreground font-semibold text-gradient' : ''}>
              {p.replace('-', ' ')}
            </span>
          </span>
        ))}
      </div>
    );
  };

  const menuGroups = getMenuGroups();

  return (
    <div className="min-h-screen flex bg-background text-foreground transition-colors duration-300 font-sans selection:bg-primary/30">
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-md lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col w-64 bg-card border-r border-border transition-transform duration-300 transform lg:static lg:translate-x-0 shadow-2xl lg:shadow-none ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between h-16 px-6 border-b border-border bg-transparent">
          <Link to="/dashboard" className="flex items-center gap-3 group">
            {currentInstitute?.logo ? (
              <img src={currentInstitute.logo} alt="Institute Logo" className="w-8 h-8 object-contain rounded-lg shadow-sm" />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center shadow-lg shadow-violet-500/30 group-hover:shadow-pink-500/40 transition-shadow">
                <GraduationCap className="w-5 h-5 text-white shrink-0" />
              </div>
            )}
            <span className="text-xl font-heading font-bold tracking-tight line-clamp-1 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent" title={currentInstitute?.name || 'EduCore LMS'}>
              {currentInstitute?.name || 'EduCore LMS'}
            </span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1 rounded-lg text-muted-foreground hover:bg-muted lg:hidden transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex-1 px-4 py-6 overflow-y-auto space-y-6 scrollbar-thin scrollbar-thumb-border">
          {menuGroups.map((group, gIdx) => (
            <div key={gIdx} className="space-y-1.5">
              <h4 className="px-3 text-[10px] font-bold tracking-widest text-muted-foreground mb-2 uppercase">
                {group.name}
              </h4>
              {group.links.map((link, idx) => {
                const Icon = link.icon;
                const isActive = location.pathname.startsWith(link.path);
                return (
                  <Link
                    key={idx}
                    to={link.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 relative overflow-hidden group ${
                      isActive
                        ? 'text-primary bg-primary/10'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    {isActive && (
                      <motion.div layoutId="activeNav" className="absolute left-0 top-1/4 bottom-1/4 w-1 rounded-r-full bg-gradient-to-b from-violet-500 to-pink-500 shadow-[0_0_10px_rgba(139,92,246,0.8)]" />
                    )}
                    <Icon className={`w-5 h-5 shrink-0 z-10 transition-transform group-hover:scale-110 ${isActive ? 'drop-shadow-[0_0_8px_rgba(139,92,246,0.5)] text-primary' : ''}`} />
                    <span className="z-10">{link.name}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-border bg-transparent">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-sm font-semibold text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="flex items-center justify-between h-16 px-6 glass shrink-0 z-30 sticky top-0">
          <div className="flex items-center gap-4 flex-1">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg text-muted-foreground hover:bg-muted lg:hidden transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="hidden sm:block min-w-[200px]">{getBreadcrumbs()}</div>
            
            <div className="hidden md:flex items-center max-w-md w-full ml-4 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-muted-foreground" />
              </div>
              <input
                type="text"
                placeholder="Search..."
                className="block w-full pl-10 pr-3 py-1.5 border border-border rounded-xl leading-5 bg-background placeholder-muted-foreground focus:outline-hidden focus:bg-background focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                onClick={() => setThemeMenuOpen(!themeMenuOpen)}
                className="p-2 rounded-full text-muted-foreground hover:bg-muted transition-colors flex items-center justify-center border border-transparent hover:border-border"
                aria-label="Theme Menu"
              >
                {theme === 'dark' ? <Moon className="w-5 h-5 text-violet-400" /> : theme === 'light' ? <Sun className="w-5 h-5 text-amber-500" /> : <MonitorSmartphone className="w-5 h-5 text-pink-500" />}
              </button>
              
              <AnimatePresence>
                {themeMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setThemeMenuOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-36 rounded-2xl shadow-lg bg-card border border-border overflow-hidden z-50 p-1.5"
                    >
                      {[
                        { id: 'light', label: 'Light', icon: Sun },
                        { id: 'dark', label: 'Dark', icon: Moon },
                        { id: 'system', label: 'System', icon: Monitor }
                      ].map(t => {
                        const Icon = t.icon;
                        return (
                          <button
                            key={t.id}
                            onClick={() => { setTheme(t.id); setThemeMenuOpen(false); }}
                            className={`flex items-center gap-3 w-full px-3 py-2 text-sm rounded-xl transition-all ${theme === t.id ? 'bg-primary/10 text-primary font-bold' : 'text-muted-foreground hover:bg-muted'}`}
                          >
                            <Icon className="w-4 h-4" />
                            {t.label}
                          </button>
                        )
                      })}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            <Link
              to="/notifications"
              className="p-2 rounded-full text-muted-foreground hover:bg-muted transition-colors relative"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-secondary ring-2 ring-background"></span>
            </Link>

            <div className="h-6 w-px bg-border mx-2"></div>

            <div className="text-right hidden md:block">
              <p className="text-sm font-semibold text-foreground">{user?.name}</p>
              <p className="text-[10px] uppercase font-bold text-primary tracking-wider bg-primary/10 px-1.5 py-0.5 rounded inline-block mt-0.5">{user?.role?.replace('_', ' ')}</p>
            </div>

            <Link
              to="/profile"
              className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary border-2 border-primary/20 hover:border-primary/50 hover:shadow-md transition-all overflow-hidden"
            >
              {user?.avatar ? (
                <img src={user.avatar} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <User className="w-5 h-5" />
              )}
            </Link>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 relative z-10 bg-background text-foreground">
          <div className="max-w-7xl mx-auto w-full">
            <PageTransition>
              <Outlet />
            </PageTransition>
          </div>
        </main>
      </div>
    </div>
  );
}
