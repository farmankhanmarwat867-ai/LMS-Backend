import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../../app/authSlice';
import { Navigate } from 'react-router-dom';
import {
  useGetSuperDashboardStatsQuery,
  useGetInstituteDashboardStatsQuery,
  useGetBranchDashboardStatsQuery,
  useGetStudentDashboardStatsQuery,
  useGetSubjectsQuery
} from '../../app/api/coreApiSlice';
import Loader from '../../components/common/Loader';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { Users, Building2, BookOpen, GraduationCap, ClipboardCheck, Wallet, FileText, AlertCircle } from 'lucide-react';
import StudentIdCardDownload from '../idCards/StudentIdCardDownload';
import { motion } from 'framer-motion';
import WelcomeBanner from '../../components/common/WelcomeBanner';
import KPICard from '../../components/common/KPICard';
import DashboardCard from '../../components/common/DashboardCard';
import StatusBadge from '../../components/common/StatusBadge';

export default function DashboardPage() {
  const user = useSelector(selectCurrentUser);
  const role = user?.role;

  if (role === 'PARENT') {
    return <Navigate to="/parent-portal" replace />;
  }

  const { data: superStats, isLoading: superLoading } = useGetSuperDashboardStatsQuery(undefined, { skip: role !== 'SUPER_ADMIN' });
  const { data: instStats, isLoading: instLoading } = useGetInstituteDashboardStatsQuery(undefined, { skip: role !== 'INSTITUTE_ADMIN' });
  const { data: branchStats, isLoading: branchLoading } = useGetBranchDashboardStatsQuery(undefined, { skip: role !== 'BRANCH_ADMIN' });
  const { data: studStats, isLoading: studLoading } = useGetStudentDashboardStatsQuery(undefined, { skip: role !== 'STUDENT' });
  const { data: teacherSubjectsResponse, isLoading: teacherSubjectsLoading } = useGetSubjectsQuery(undefined, { skip: role !== 'TEACHER' });

  const isLoading =
    role === 'SUPER_ADMIN' ? superLoading :
    role === 'INSTITUTE_ADMIN' ? instLoading :
    role === 'BRANCH_ADMIN' ? branchLoading :
    role === 'STUDENT' ? studLoading :
    role === 'TEACHER' ? teacherSubjectsLoading :
    false;

  if (isLoading) {
    return <Loader size="lg" className="min-h-[60vh]" />;
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border p-3 rounded-xl shadow-lg">
          <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">{label}</p>
          <p className="text-lg font-bold text-foreground">
            {payload[0].value} <span className="text-xs font-medium text-muted-foreground">users</span>
          </p>
        </div>
      );
    }
    return null;
  };

  if (role === 'SUPER_ADMIN') {
    const stats = superStats?.data || {};
    const cardData = [
      { title: 'Total Institutes', value: stats.totalInstitutes || 0, icon: Building2 },
      { title: 'Active Institutes', value: stats.activeInstitutes || 0, icon: Building2 },
      { title: 'Platform Users', value: stats.totalUsers || 0, icon: Users },
      { title: 'Total Subjects', value: stats.totalCourses || 0, icon: BookOpen },
    ];

    const chartData = stats.usersByRole?.map((r) => ({ name: r._id, Count: r.count })) || [];

    return (
      <div className="space-y-6 pb-12">
        <WelcomeBanner userName={user.name} role="Super Admin Command Center" />
        
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {cardData.map((c, idx) => (
            <motion.div key={idx} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }}>
              <KPICard {...c} />
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="lg:col-span-2">
            <DashboardCard title="User Distribution">
              <div className="h-[300px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{fill: 'hsl(var(--muted))'}} />
                    <Bar dataKey="Count" radius={[6, 6, 0, 0]} barSize={40}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index % 2 === 0 ? 'hsl(var(--primary))' : 'hsl(var(--secondary))'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </DashboardCard>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <DashboardCard title="Recent Institutes" className="h-full">
              <div className="flex flex-col gap-3 mt-4 h-[300px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-border">
                {stats.recentInstitutes?.map((inst, idx) => (
                  <div key={idx} className="group flex justify-between items-center p-3 rounded-xl hover:bg-muted transition-colors border border-transparent hover:border-border">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{inst.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{inst.email}</p>
                    </div>
                    <StatusBadge 
                      status={(inst.status === 'ACTIVE' || inst.isActive) ? 'Active' : 'Suspended'} 
                      type={(inst.status === 'ACTIVE' || inst.isActive) ? 'success' : 'danger'} 
                    />
                  </div>
                ))}
              </div>
            </DashboardCard>
          </motion.div>
        </div>
      </div>
    );
  }

  if (role === 'INSTITUTE_ADMIN') {
    const stats = instStats?.data || {};
    const cardData = [
      { title: 'Branches', value: stats.totalBranches || 0, icon: Building2 },
      { title: 'Teachers', value: stats.totalTeachers || 0, icon: Users },
      { title: 'Students', value: stats.totalStudents || 0, icon: GraduationCap },
      { title: 'Subjects', value: stats.totalCourses || 0, icon: BookOpen },
      { title: 'Enrollments', value: stats.totalEnrollments || 0, icon: ClipboardCheck },
    ];

    return (
      <div className="space-y-6 pb-12">
        <WelcomeBanner userName={user.name} role="Institute Administration Console" />
        
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {cardData.map((c, idx) => (
            <motion.div key={idx} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }}>
              <KPICard {...c} />
            </motion.div>
          ))}
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <DashboardCard title="Recent Subject Assignments" className="p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-muted text-muted-foreground border-b border-border">
                    <th className="py-4 px-6 font-semibold">Subject Title</th>
                    <th className="py-4 px-6 font-semibold">Teacher</th>
                    <th className="py-4 px-6 font-semibold text-center">Enrollment Count</th>
                    <th className="py-4 px-6 font-semibold text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-foreground">
                  {stats.recentCourses?.map((course, idx) => (
                    <tr key={idx} className="hover:bg-muted/50 transition-colors">
                      <td className="py-4 px-6 font-medium">{course.title}</td>
                      <td className="py-4 px-6 text-muted-foreground">{course.teacherId?.name || 'Unassigned'}</td>
                      <td className="py-4 px-6 text-center font-mono">{course.enrollmentCount || 0}</td>
                      <td className="py-4 px-6 text-right">
                        <StatusBadge 
                          status={course.isPublished ? 'Published' : 'Draft'} 
                          type={course.isPublished ? 'success' : 'warning'} 
                        />
                      </td>
                    </tr>
                  ))}
                  {(!stats.recentCourses || stats.recentCourses.length === 0) && (
                    <tr>
                      <td colSpan="4" className="py-12 text-center text-muted-foreground font-medium">No recent subjects found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </DashboardCard>
        </motion.div>
      </div>
    );
  }

  if (role === 'BRANCH_ADMIN') {
    const stats = branchStats?.data || {};
    const cardData = [
      { title: 'Classes', value: stats.totalClasses || 0, icon: GraduationCap },
      { title: 'Teachers', value: stats.totalTeachers || 0, icon: Users },
      { title: 'Students', value: stats.totalStudents || 0, icon: GraduationCap },
      { title: 'Subjects', value: stats.totalCourses || 0, icon: BookOpen },
      { title: 'Enrollments', value: stats.totalEnrollments || 0, icon: ClipboardCheck },
    ];

    return (
      <div className="space-y-6 pb-12">
        <WelcomeBanner userName={user.name} role="Branch Administration Console" />
        
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {cardData.map((c, idx) => (
             <motion.div key={idx} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }}>
              <KPICard {...c} />
            </motion.div>
          ))}
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <DashboardCard title="Recent Branch Subjects" className="p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-muted text-muted-foreground border-b border-border">
                    <th className="py-4 px-6 font-semibold">Subject Title</th>
                    <th className="py-4 px-6 font-semibold">Teacher</th>
                    <th className="py-4 px-6 font-semibold text-center">Enrollment Count</th>
                    <th className="py-4 px-6 font-semibold text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-foreground">
                  {stats.recentCourses?.map((course, idx) => (
                    <tr key={idx} className="hover:bg-muted/50 transition-colors">
                      <td className="py-4 px-6 font-medium">{course.title}</td>
                      <td className="py-4 px-6 text-muted-foreground">{course.teacherId?.name || 'Unassigned'}</td>
                      <td className="py-4 px-6 text-center font-mono">{course.enrollmentCount || 0}</td>
                      <td className="py-4 px-6 text-right">
                        <StatusBadge 
                          status={course.status} 
                          type={course.status === 'ACTIVE' ? 'success' : 'default'} 
                        />
                      </td>
                    </tr>
                  ))}
                  {(!stats.recentCourses || stats.recentCourses.length === 0) && (
                    <tr>
                      <td colSpan="4" className="py-12 text-center text-muted-foreground font-medium">No recent subjects found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </DashboardCard>
        </motion.div>
      </div>
    );
  }

  if (role === 'STUDENT') {
    const stats = studStats?.data || {};
    const cardData = [
      { title: 'Enrolled Subjects', value: stats.enrolledCourses || 0, icon: BookOpen },
      { title: 'Assignments', value: stats.totalAssignments || 0, icon: FileText },
      { title: 'Submissions', value: stats.totalSubmissions || 0, icon: ClipboardCheck },
      { title: 'Pending', value: stats.pendingAssignments || 0, icon: AlertCircle },
    ];

    return (
      <div className="space-y-6 pb-12">
        <WelcomeBanner userName={user.name} role="Student Portal">
           <div className="mt-4 md:mt-0 relative z-10">
             <StudentIdCardDownload />
           </div>
        </WelcomeBanner>
        
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {cardData.map((c, idx) => (
            <motion.div key={idx} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }}>
              <KPICard {...c} />
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <DashboardCard title="Recent Submissions" className="h-full">
              <div className="flex flex-col gap-3 mt-4">
                {stats.recentSubmissions?.map((sub, idx) => (
                  <div key={idx} className="flex justify-between items-center p-4 rounded-xl border border-border hover:bg-muted/50 transition-colors">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{sub.assignmentId?.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Marks: <span className="font-medium text-foreground">{sub.marksObtained !== undefined ? `${sub.marksObtained} / ${sub.assignmentId?.maxMarks}` : 'Pending review'}</span>
                      </p>
                    </div>
                    <StatusBadge status={sub.status} type={sub.status === 'GRADED' ? 'success' : 'primary'} />
                  </div>
                ))}
                {(!stats.recentSubmissions || stats.recentSubmissions.length === 0) && (
                  <p className="text-center text-sm text-muted-foreground py-8">No recent submissions.</p>
                )}
              </div>
            </DashboardCard>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <DashboardCard title="Registered Subjects" className="h-full">
              <div className="flex flex-col gap-3 mt-4">
                {stats.enrollments?.map((enroll, idx) => (
                  <div key={idx} className="flex justify-between items-center p-4 rounded-xl border border-border hover:bg-muted/50 transition-colors">
                    <span className="text-sm font-semibold text-foreground">{enroll.courseId?.title}</span>
                    <StatusBadge status={enroll.status} type="primary" />
                  </div>
                ))}
                {(!stats.enrollments || stats.enrollments.length === 0) && (
                  <p className="text-center text-sm text-muted-foreground py-8">No registered subjects.</p>
                )}
              </div>
            </DashboardCard>
          </motion.div>
        </div>
      </div>
    );
  }

  if (role === 'TEACHER') {
    const subjects = teacherSubjectsResponse?.data || [];
    const totalSubjects = subjects.length;
    const uniqueClasses = Array.from(new Set(subjects.map(s => s.classId?._id).filter(Boolean))).length;
    const uniqueSections = Array.from(new Set(subjects.map(s => s.sectionId?._id).filter(Boolean))).length;

    const cardData = [
      { title: 'Assigned Subjects', value: totalSubjects, icon: BookOpen },
      { title: 'Classes Taught', value: uniqueClasses, icon: GraduationCap },
      { title: 'Active Sections', value: uniqueSections, icon: Users },
    ];

    return (
      <div className="space-y-6 pb-12">
        <WelcomeBanner userName={user.name} role="Teacher Dashboard" />

        <div className="grid gap-6 grid-cols-1 sm:grid-cols-3">
          {cardData.map((c, idx) => (
            <motion.div key={idx} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }}>
              <KPICard {...c} />
            </motion.div>
          ))}
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <DashboardCard title="Teaching Schedule & Placements" className="p-0 overflow-hidden">
            {subjects.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="w-8 h-8 text-muted-foreground/50" />
                </div>
                <p className="text-sm font-semibold tracking-wide">No classes assigned yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-muted text-muted-foreground border-b border-border">
                      <th className="py-4 px-6 font-semibold">Subject</th>
                      <th className="py-4 px-6 font-semibold">Subject Code</th>
                      <th className="py-4 px-6 font-semibold">Class</th>
                      <th className="py-4 px-6 font-semibold">Section</th>
                      <th className="py-4 px-6 font-semibold text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-foreground">
                    {subjects.map((sub, idx) => (
                      <tr key={idx} className="hover:bg-muted/50 transition-colors">
                        <td className="py-4 px-6 font-medium">{sub.name}</td>
                        <td className="py-4 px-6"><code className="text-xs bg-muted px-2 py-1 rounded-md font-mono">{sub.code}</code></td>
                        <td className="py-4 px-6 text-muted-foreground">{sub.classId?.name || 'N/A'}</td>
                        <td className="py-4 px-6 text-muted-foreground">{sub.sectionId?.name || 'N/A'}</td>
                        <td className="py-4 px-6 text-right">
                          <StatusBadge status={sub.status} type={sub.status === 'ACTIVE' ? 'success' : 'default'} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </DashboardCard>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-6 flex items-center justify-center min-h-[70vh]">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.5 }}
        className="p-10 bg-card border border-border rounded-3xl text-center max-w-lg shadow-sm"
      >
        <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
          <GraduationCap className="w-10 h-10 text-primary" />
        </div>
        <h3 className="text-2xl font-bold font-heading tracking-tight mb-4">Welcome to EduCore LMS</h3>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Navigate through the side menu to view your dashboard, manage users, and access your daily reports.
        </p>
      </motion.div>
    </div>
  );
}
