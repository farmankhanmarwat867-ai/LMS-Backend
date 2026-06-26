import React, { useState } from 'react';
import { useGetDailyAttendanceReportsQuery, useGetClassesQuery, useGetSectionsQuery } from '../../app/api/coreApiSlice';
import Table from '../../components/common/Table';
import Select from '../../components/common/Select';
import Input from '../../components/common/Input';
import { ClipboardCheck, Calendar as CalendarIcon, CheckCircle, ShieldAlert } from 'lucide-react';
import dayjs from 'dayjs';

export default function DailyAttendanceReport() {
  const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');

  const { data: classesData } = useGetClassesQuery({});
  const { data: sectionsData } = useGetSectionsQuery({});
  
  const { data: reportsData, isLoading } = useGetDailyAttendanceReportsQuery({
    date: selectedDate,
    classId: selectedClass || undefined,
    sectionId: selectedSection || undefined
  });

  const classes = classesData?.data || [];
  const sections = sectionsData?.data || [];
  const reports = reportsData?.data || [];

  const filteredSections = selectedClass
    ? sections.filter(s => (s.classId?._id || s.classId) === selectedClass)
    : sections;

  const columns = [
    {
      header: 'Student',
      accessorKey: 'studentId',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-100 overflow-hidden">
            {row.original.studentId?.avatar ? (
              <img src={row.original.studentId.avatar} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs font-bold text-slate-400">
                {row.original.studentId?.name?.charAt(0) || '?'}
              </div>
            )}
          </div>
          <div>
            <p className="text-sm font-bold text-[var(--color-text-[var(--color-primary-pink)])] dark:text-slate-200">{row.original.studentId?.name || 'Unknown'}</p>
            <p className="text-xs text-[var(--color-text-secondary)]">{row.original.studentId?.studentId || 'N/A'}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'Class / Section',
      accessorKey: 'classId',
      cell: ({ row }) => (
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
          {row.original.classId?.name || 'N/A'} - {row.original.sectionId?.name || 'N/A'}
        </span>
      ),
    },
    {
      header: 'Roll No',
      accessorKey: 'rollNumber',
      cell: ({ row }) => <span className="text-sm">{row.original.rollNumber || '-'}</span>
    },
    {
      header: 'Check-in Time',
      accessorKey: 'checkInTime',
      cell: ({ row }) => (
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          {dayjs(row.original.checkInTime).format('hh:mm A')}
        </span>
      )
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: ({ row }) => {
        const isPresent = row.original.status === 'PRESENT';
        return (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
            isPresent ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
            'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
          }`}>
            {isPresent ? <CheckCircle className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
            {row.original.status}
          </span>
        );
      }
    },
    {
      header: 'Method',
      accessorKey: 'attendanceMethod',
      cell: ({ row }) => (
        <span className="text-xs px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded font-mono text-[var(--color-text-secondary)]">
          {row.original.attendanceMethod}
        </span>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-[var(--color-primary-pink)])] flex items-center gap-2">
            <ClipboardCheck className="w-6 h-6 text-[var(--color-primary-pink)]" />
            Daily Gate Attendance
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">View permanent ID card check-in logs.</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-xs border border-black/5 dark:border-white/5 grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Input
          type="date"
          label="Date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          icon={<CalendarIcon className="w-4 h-4" />}
        />
        <Select
          label="Class"
          options={[{ value: '', label: 'All Classes' }, ...classes.map(c => ({ value: c._id, label: c.name }))]}
          value={selectedClass}
          onChange={(e) => { setSelectedClass(e.target.value); setSelectedSection(''); }}
        />
        <Select
          label="Section"
          options={[{ value: '', label: 'All Sections' }, ...filteredSections.map(s => ({ value: s._id, label: s.name }))]}
          value={selectedSection}
          onChange={(e) => setSelectedSection(e.target.value)}
          disabled={!selectedClass}
        />
        <div className="flex items-end pb-1">
          <div className="text-sm font-bold text-[var(--color-text-secondary)]">
            Total Scanned: <span className="text-[var(--color-primary-pink)]">{reports.length}</span>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-black/5 dark:border-white/5 overflow-hidden">
        <Table columns={columns} data={reports} isLoading={isLoading} />
      </div>
    </div>
  );
}
