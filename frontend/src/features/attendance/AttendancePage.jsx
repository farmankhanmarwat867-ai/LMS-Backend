import React, { useState, useEffect } from 'react';
import {
  useGetAttendanceQuery,
  useTakeAttendanceMutation,
  useGetSubjectsQuery,
  useGetCourseStudentsQuery
} from '../../app/api/coreApiSlice';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../../app/authSlice';
import Button from '../../components/common/Button';
import Table from '../../components/common/Table';
import Select from '../../components/common/Select';
import Input from '../../components/common/Input';
import Modal from '../../components/common/Modal';
import { toast } from 'react-hot-toast';
import { ClipboardCheck, History, Calendar, Check, AlertCircle } from 'lucide-react';
import dayjs from 'dayjs';
import StudentAttendanceView from './StudentAttendanceView';

export default function AttendancePage() {
  const currentUser = useSelector(selectCurrentUser);
  const isTeacher = currentUser?.role === 'TEACHER';
  const isStudent = currentUser?.role === 'STUDENT';

  const [activeTab, setActiveTab] = useState('take'); // 'take' or 'history'
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [attendanceDate, setAttendanceDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [lectureTopic, setLectureTopic] = useState('');
  const [attendeesList, setAttendeesList] = useState([]);
  const [viewingLog, setViewingLog] = useState(null);

  if (isStudent) {
    return <StudentAttendanceView />;
  }

  // API Queries & Mutations
  const { data: coursesResponse } = useGetSubjectsQuery({ limit: 200 });
  const { data: studentsResponse, isLoading: studentsLoading } = useGetCourseStudentsQuery(
    selectedCourseId,
    { skip: !selectedCourseId }
  );
  
  const { data: historyResponse, isLoading: historyLoading, refetch: refetchHistory } = useGetAttendanceQuery(
    activeTab === 'history' ? { courseId: selectedCourseId || undefined } : undefined,
    { skip: activeTab !== 'history' }
  );

  const [takeAttendance, { isLoading: isSubmitting }] = useTakeAttendanceMutation();

  const courses = coursesResponse?.data || [];
  const courseOptions = courses.map(c => {
    const className = c.classId?.name ? `Class ${c.classId.name}` : '';
    const sectionName = c.sectionId?.name ? `(Sec ${c.sectionId.name})` : '';
    const subjectName = c.name || c.title || 'Unknown Subject';
    const label = className ? `${className} ${sectionName} - ${subjectName}` : subjectName;
    return { value: c._id, label: label.trim() };
  });

  const enrollments = studentsResponse?.data || [];
  const historyLogs = historyResponse?.data || [];

  // Populate attendee list when students load
  useEffect(() => {
    const currentEnrollments = studentsResponse?.data || [];
    const students = currentEnrollments.map(e => e.studentId).filter(Boolean);
    if (students.length > 0) {
      const list = students.map((s) => ({
        studentId: s._id,
        name: s.name,
        email: s.email,
        status: 'PRESENT',
        remarks: '',
      }));
      setAttendeesList(list);
    } else {
      setAttendeesList([]);
    }
  }, [studentsResponse?.data]);

  const handleStatusChange = (studentId, status) => {
    setAttendeesList((prev) =>
      prev.map((a) => (a.studentId === studentId ? { ...a, status } : a))
    );
  };

  const handleRemarksChange = (studentId, remarks) => {
    setAttendeesList((prev) =>
      prev.map((a) => (a.studentId === studentId ? { ...a, remarks } : a))
    );
  };

  const handleMarkAll = (status) => {
    setAttendeesList((prev) => prev.map((a) => ({ ...a, status })));
  };

  const handleSubmitAttendance = async () => {
    if (!selectedCourseId) {
      toast.error('Please select a class & subject first');
      return;
    }
    if (attendeesList.length === 0) {
      toast.error('No students loaded to mark attendance');
      return;
    }

    const payload = {
      courseId: selectedCourseId,
      date: new Date(attendanceDate).toISOString(),
      topic: lectureTopic,
      attendees: attendeesList.map((a) => ({
        studentId: a.studentId,
        status: a.status,
        remarks: a.remarks,
      })),
    };

    try {
      await takeAttendance(payload).unwrap();
      toast.success('Attendance recorded successfully!');
      setLectureTopic('');
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to submit attendance');
    }
  };

  const historyColumns = [
    { 
      header: 'Class Date & Recorded Time', 
      accessorKey: 'date', 
      cell: ({ row, getValue }) => (
        <div>
          <div className="font-semibold text-[var(--color-text-[var(--color-primary-pink)])]">{dayjs(getValue()).format('MMM DD, YYYY')}</div>
          <div className="text-[11px] text-[var(--color-text-secondary)]">Recorded: {dayjs(row.original.createdAt).format('MMM DD, YYYY hh:mm A')}</div>
        </div>
      ) 
    },
    { header: 'Subject', accessorKey: 'courseId.name', cell: ({ row }) => row.original.courseId?.name || 'General' },
    { header: 'Topic', accessorKey: 'topic', cell: ({ getValue }) => getValue() || 'N/A' },
    {
      header: 'Present Count',
      cell: ({ row }) => {
        const list = row.original.attendees || [];
        const present = list.filter((a) => a.status === 'PRESENT').length;
        return `${present} / ${list.length}`;
      },
    },
    {
      header: 'Actions',
      cell: ({ row }) => (
        <Button onClick={() => setViewingLog(row.original)} variant="primary" size="sm" title="View Details">
          <ClipboardCheck className="w-3.5 h-3.5 inline mr-1" /> View
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-[var(--color-text-[var(--color-primary-pink)])]">Class Attendance</h2>
        
        {/* Toggle tabs */}
        <div className="flex bg-slate-100 dark:bg-slate-900 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('take')}
            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
              activeTab === 'take'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-[var(--color-primary-pink)])]'
            }`}
          >
            <ClipboardCheck className="w-3.5 h-3.5 inline mr-1" /> Mark Sheets
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
              activeTab === 'history'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-[var(--color-primary-pink)])]'
            }`}
          >
            <History className="w-3.5 h-3.5 inline mr-1" /> History logs
          </button>
        </div>
      </div>

      {/* Course & Date Filters */}
      <div className="glass-card p-6 rounded-xl shadow-xs grid grid-cols-1 md:grid-cols-3 gap-4">
        <Select
          id="courseFilter"
          label="Class & Subject"
          options={courseOptions}
          placeholder="Select Class & Subject"
          value={selectedCourseId}
          onChange={(e) => setSelectedCourseId(e.target.value)}
        />

        {activeTab === 'take' && (
          <>
            <Input
              id="dateFilter"
              label="Attendance Date"
              type="date"
              value={attendanceDate}
              onChange={(e) => setAttendanceDate(e.target.value)}
            />
            <Input
              id="topicInput"
              label="Lecture Topic / Notes"
              placeholder="e.g. Chapter 4 Integration"
              value={lectureTopic}
              onChange={(e) => setLectureTopic(e.target.value)}
            />
          </>
        )}
      </div>

      {activeTab === 'take' && (
        <div className="glass-card p-6 rounded-xl shadow-xs space-y-4">
          <div className="flex justify-between items-center border-b border-black/5 dark:border-white/5 pb-3 flex-wrap gap-2">
            <h3 className="text-sm font-bold text-[var(--color-text-[var(--color-primary-pink)])] dark:text-slate-200 uppercase tracking-wider">Attendance Checklist</h3>
            {attendeesList.length > 0 && (
              <div className="flex gap-2">
                <Button onClick={() => handleMarkAll('PRESENT')} variant="outline" size="sm" className="text-xs text-[var(--color-status-success)]">All Present</Button>
                <Button onClick={() => handleMarkAll('ABSENT')} variant="outline" size="sm" className="text-xs text-rose-600">All Absent</Button>
              </div>
            )}
          </div>

          {!selectedCourseId ? (
            <p className="text-center py-10 text-sm text-slate-400 font-medium">Please select a class & subject to load the student list.</p>
          ) : studentsLoading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary border-black/5"></div>
            </div>
          ) : attendeesList.length === 0 ? (
            <p className="text-center py-10 text-sm text-slate-400 font-medium">No students enrolled in this class/subject.</p>
          ) : (
            <div className="space-y-3">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-black/5 dark:border-white/5 text-[var(--color-text-secondary)] font-semibold">
                      <th className="py-2">Student Name</th>
                      <th className="py-2 text-center">Marking Status</th>
                      <th className="py-2 text-right">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {attendeesList.map((attendee) => (
                      <tr key={attendee.studentId}>
                        <td className="py-3 font-semibold text-[var(--color-text-[var(--color-primary-pink)])] dark:text-slate-200">{attendee.name}</td>
                        <td className="py-3">
                          <div className="flex items-center justify-center gap-2">
                            {['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'].map((status) => (
                              <button
                                key={status}
                                type="button"
                                onClick={() => handleStatusChange(attendee.studentId, status)}
                                className={`px-2.5 py-1 text-[11px] font-bold rounded-md uppercase tracking-wider transition-all ${
                                  attendee.status === status
                                    ? status === 'PRESENT'
                                      ? 'bg-emerald-600 text-white shadow-xs'
                                      : status === 'ABSENT'
                                      ? 'bg-red-600 text-white shadow-xs'
                                      : 'bg-amber-600 text-white shadow-xs'
                                    : 'bg-slate-100 hover:bg-slate-200 text-[var(--color-text-secondary)] dark:bg-slate-800 dark:hover:bg-slate-700'
                                }`}
                              >
                                {status.toLowerCase()}
                              </button>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 text-right">
                          <input
                            type="text"
                            placeholder="Add remarks..."
                            value={attendee.remarks}
                            onChange={(e) => handleRemarksChange(attendee.studentId, e.target.value)}
                            className="bg-[var(--color-primary-pink)]/5 border border-slate-300 dark:bg-slate-900 dark:border-slate-800 rounded-md px-2 py-1 text-xs w-48 text-[var(--color-text-[var(--color-primary-pink)])]"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end pt-4 border-t border-black/5 dark:border-white/5">
                <Button onClick={handleSubmitAttendance} isLoading={isSubmitting} className="gap-2">
                  <Check className="w-4 h-4" />
                  <span>Save Attendance Sheets</span>
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-4">
          {/* Simple Analytics Row */}
          {historyLogs.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-100 dark:border-emerald-800 p-4 rounded-xl">
                <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-400">Total Classes Conducted</p>
                <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">{historyLogs.length}</p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 p-4 rounded-xl">
                <p className="text-sm font-semibold text-blue-800 dark:text-blue-400">Average Present Rate</p>
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                  {Math.round(
                    (historyLogs.reduce((acc, log) => acc + log.attendees.filter(a => a.status === 'PRESENT').length, 0) /
                     Math.max(1, historyLogs.reduce((acc, log) => acc + log.attendees.length, 0))) * 100
                  )}%
                </p>
              </div>
            </div>
          )}

          <Table columns={historyColumns} data={historyLogs} isLoading={historyLoading} />
        </div>
      )}

      {viewingLog && (
        <Modal isOpen={!!viewingLog} onClose={() => setViewingLog(null)} title={`Attendance Details: ${viewingLog.courseId?.title || ''}`} size="lg">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm text-slate-700 dark:text-slate-300">
              <div>
                <p><strong>Class Date:</strong> {dayjs(viewingLog.date).format('MMM DD, YYYY')}</p>
                <p className="text-xs text-[var(--color-text-secondary)] mt-1"><strong>Recorded At:</strong> {dayjs(viewingLog.createdAt).format('MMM DD, YYYY hh:mm A')}</p>
              </div>
              <div>
                <p><strong>Topic:</strong> {viewingLog.topic || 'N/A'}</p>
                <p><strong>Recorded By:</strong> {viewingLog.recordedBy?.name || 'Unknown'}</p>
              </div>
            </div>
            
            <div className="overflow-x-auto border border-black/5 dark:border-white/5 rounded-lg">
              <table className="w-full text-left text-sm">
                <thead className="bg-[var(--color-primary-pink)]/5 dark:bg-slate-900 text-slate-600 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-2 font-medium">Student</th>
                    <th className="px-4 py-2 font-medium">Status</th>
                    <th className="px-4 py-2 font-medium">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {viewingLog.attendees.map((a) => (
                    <tr key={a.studentId?._id || a._id}>
                      <td className="px-4 py-2 text-slate-900 dark:text-slate-100 font-medium">{a.studentId?.name || 'Unknown'}</td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          a.status === 'PRESENT' ? 'bg-emerald-100 text-emerald-800' :
                          a.status === 'ABSENT' ? 'bg-red-100 text-red-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {a.status}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-[var(--color-text-secondary)] italic text-xs">{a.remarks || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="flex justify-end pt-4 border-t border-black/5 dark:border-white/5">
              <Button onClick={() => setViewingLog(null)} variant="secondary">Close</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
