import React, { useState } from 'react';
import { useGetStudentAttendanceQuery } from '../../app/api/coreApiSlice';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../../app/authSlice';
import Table from '../../components/common/Table';
import dayjs from 'dayjs';
import { Calendar, AlertCircle } from 'lucide-react';
import Select from '../../components/common/Select';

export default function StudentAttendanceView() {
  const currentUser = useSelector(selectCurrentUser);
  const [filterPeriod, setFilterPeriod] = useState('monthly'); // daily, weekly, monthly

  const studentId = currentUser?.id || currentUser?._id;

  const { data: response, isLoading, error } = useGetStudentAttendanceQuery({ 
    studentId, 
    period: filterPeriod
  }, { skip: !studentId });

  const records = response?.data?.records || [];
  const summary = response?.data?.summary || { PRESENT: 0, ABSENT: 0, LATE: 0, total: 0 };
  console.log("ATTENDANCE RESPONSE:", response, "ERROR:", error, "RECORDS:", records);

  const columns = [
    { header: 'Date', accessorKey: 'date', cell: ({ getValue }) => dayjs(getValue()).format('MMM DD, YYYY') },
    { 
      header: 'Class / Subject', 
      id: 'classAndSubject',
      cell: ({ row }) => {
        const className = row.original.classId?.name;
        const subjectName = row.original.courseId?.name;
        if (className && subjectName) return `${className} - ${subjectName}`;
        if (className) return `${className} - General`;
        if (subjectName) return subjectName;
        return 'General';
      } 
    },
    {
      header: 'Status',
      id: 'status',
      cell: ({ row }) => {
        const val = row.original.attendees?.[0]?.status || 'UNKNOWN';
        const colors = {
          PRESENT: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400',
          ABSENT: 'bg-red-100 text-red-800 dark:bg-red-950/20 dark:text-red-400',
          LATE: 'bg-amber-100 text-amber-800 dark:bg-amber-950/20 dark:text-amber-400',
        };
        return (
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${colors[val] || 'bg-slate-100'}`}>
            {val}
          </span>
        );
      },
    },
    { header: 'Remarks', id: 'remarks', cell: ({ row }) => row.original.attendees?.[0]?.remarks || '-' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 items-start">
        <h2 className="text-xl font-bold text-[var(--color-text-[var(--color-primary-pink)])]">My Attendance Logs</h2>
        
        {/* QR info note */}
        <div className="text-sm bg-blue-50 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 px-4 py-2 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>Need to check in? Use the <strong>QR Check-in</strong> page from the sidebar menu.</span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-4 rounded-xl">
          <p className="text-sm text-[var(--color-text-secondary)]">Total Classes</p>
          <p className="text-2xl font-bold text-[var(--color-text-[var(--color-primary-pink)])]">{summary.total}</p>
        </div>
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-4 rounded-xl">
          <p className="text-sm text-[var(--color-status-success)] dark:text-emerald-400">Present</p>
          <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{summary.PRESENT || 0}</p>
        </div>
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 rounded-xl">
          <p className="text-sm text-amber-600 dark:text-amber-400">Late</p>
          <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{summary.LATE || 0}</p>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-xl">
          <p className="text-sm text-[var(--color-status-error)] dark:text-red-400">Absent</p>
          <p className="text-2xl font-bold text-red-700 dark:text-red-300">{summary.ABSENT || 0}</p>
        </div>
      </div>

      <div className="glass-card rounded-xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-black/5 dark:border-white/5 flex justify-between items-center">
          <h3 className="font-semibold text-[var(--color-text-[var(--color-primary-pink)])] dark:text-slate-200 flex items-center">
            <Calendar className="w-4 h-4 mr-2" />
            Attendance History
          </h3>
          <div className="w-48">
             <Select
                id="filterPeriod"
                value={filterPeriod}
                onChange={(e) => setFilterPeriod(e.target.value)}
                options={[
                  { value: 'daily', label: 'Daily View' },
                  { value: 'weekly', label: 'Weekly View' },
                  { value: 'monthly', label: 'Monthly View' },
                  { value: 'all', label: 'All Time' }
                ]}
              />
          </div>
        </div>
        <Table columns={columns} data={records} isLoading={isLoading} emptyMessage="No attendance records found." />
      </div>
    </div>
  );
}
