import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import {
  useGetResultsQuery,
  useGetMyResultsQuery,
  useCreateResultMutation,
  usePublishResultMutation,
  useUpdateResultMutation,
  useBulkUploadResultsMutation,
  useGetExamSchedulesQuery,
  useGetUsersQuery,
  useGetInstitutesQuery,
} from '../../app/api/coreApiSlice';
import { selectCurrentUser } from '../../app/authSlice';
import Button from '../../components/common/Button';
import Select from '../../components/common/Select';
import Input from '../../components/common/Input';
import Modal from '../../components/common/Modal';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'react-hot-toast';
import { 
  Plus, Check, Lock, Edit2, School, BookOpen, 
  Users, Award, TrendingUp, X, Layers, Trash2
} from 'lucide-react';

const resultSchema = z.object({
  studentId: z.string().min(1, 'Student is required'),
  examScheduleId: z.string().min(1, 'Exam schedule slot is required'),
  marksObtained: z.coerce.number().min(0, 'Marks must be non-negative'),
  remarks: z.string().optional(),
  status: z.enum(['PASS', 'FAIL', 'ABSENT', 'WITHHELD', 'INCOMPLETE']),
});

const VALID_STATUSES = ['PASS', 'FAIL', 'ABSENT', 'WITHHELD', 'INCOMPLETE'];

const formatDate = (dateVal) => {
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return 'N/A';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return 'N/A';
  }
};

const getGradeColor = (grade) => {
  switch (String(grade).toUpperCase()) {
    case 'A': return '#10b981';
    case 'B': return '#06b6d4';
    case 'C': return '#3b82f6';
    case 'D': return '#f97316';
    case 'F': return '#ef4444';
    default: return '#8b5cf6';
  }
};

const Avatar = ({ student }) => {
  const [imgError, setImgError] = useState(false);
  const initial = student?.name?.charAt(0).toUpperCase() || '?';
  
  if (student?.avatar && !imgError) {
    return (
      <img
        src={student.avatar}
        alt={student.name}
        className="w-11 h-11 rounded-full object-cover border border-black/5 dark:border-slate-700/80 shadow-sm shrink-0"
        onError={() => setImgError(true)}
      />
    );
  }
  
  return (
    <div className="w-11 h-11 rounded-full bg-[var(--color-primary-pink)]/10 text-[var(--color-primary-pink)] border border-primary/20 flex items-center justify-center font-bold text-sm shrink-0 uppercase shadow-sm">
      {initial}
    </div>
  );
};

// ─── Empty Bulk Row ───────────────────────────────────────────────────────────
const emptyRow = () => ({ studentId: '', marksObtained: '', status: 'PASS', remarks: '' });

export default function ResultsPage() {
  const [modalOpen, setModalOpen]         = useState(false);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [editingResult, setEditingResult] = useState(null);
  const [selectedClassId, setSelectedClassId]     = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [currentPage, setCurrentPage]   = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Bulk state
  const [bulkScheduleId, setBulkScheduleId] = useState('');
  const [bulkRows, setBulkRows] = useState([emptyRow()]);

  // Auth
  const currentUser = useSelector(selectCurrentUser);
  const isViewOnly  = currentUser?.role === 'STUDENT' || currentUser?.role === 'PARENT';

  // Queries — students use /results/my (authorized), others use /results
  const { data: resultsResponse,   isLoading: resultsLoading,   refetch: refetchAll } = useGetResultsQuery(  { limit: 1000 }, { skip: isViewOnly });
  const { data: myResultsResponse, isLoading: myResultsLoading, refetch: refetchMine } = useGetMyResultsQuery({ limit: 1000 }, { skip: !isViewOnly });

  const refetch = isViewOnly ? refetchMine : refetchAll;
  const isResultsLoading = isViewOnly ? myResultsLoading : resultsLoading;
  const { data: schedsResponse }    = useGetExamSchedulesQuery({ limit: 100 });
  const { data: studentsResponse }  = useGetUsersQuery({ role: 'STUDENT', limit: 200 });
  // Fetch current institute for dynamic school name
  const { data: institutesResponse } = useGetInstitutesQuery(
    { _id: currentUser?.instituteId, limit: 1 },
    { skip: !currentUser?.instituteId }
  );

  // Mutations
  const [createResult,      { isLoading: isCreating }]   = useCreateResultMutation();
  const [publishResult,     { isLoading: isPublishing }] = usePublishResultMutation();
  const [updateResult,      { isLoading: isUpdating }]   = useUpdateResultMutation();
  const [bulkUploadResults, { isLoading: isBulking }]    = useBulkUploadResultsMutation();

  const results   = isViewOnly
    ? (myResultsResponse?.data || myResultsResponse?.results || [])
    : (resultsResponse?.data || []);
  const schedules = schedsResponse?.data  || [];
  const students  = studentsResponse?.data?.docs || studentsResponse?.data || [];

  // ── Dynamic School Name ───────────────────────────────────────────────────
  // Priority: institute API → result data → fallback
  const instituteFromApi = institutesResponse?.data?.docs?.[0] || institutesResponse?.data?.[0];
  const schoolName =
    instituteFromApi?.name ||
    results.find(r => r.instituteId?.name)?.instituteId?.name ||
    currentUser?.instituteName ||
    'My School';

  // studentOptions is now computed dynamically below (after useForm), filtered by selected schedule class
  const scheduleOptions = schedules.map(s => ({
    value: s._id,
    label: `${s.examId?.title || 'Exam'} — ${s.subjectId?.name || 'Subject'} (${formatDate(s.examDate)})`
  }));

  // Unique Class filter options from results & schedules
  const uniqueClasses = [];
  const seenClasses = new Set();

  const addClass = (cid, cname) => {
    if (cid && !seenClasses.has(cid)) {
      seenClasses.add(cid);
      uniqueClasses.push({ id: cid, name: cname || 'N/A' });
    }
  };

  results.forEach(r => addClass(r.classId?._id, r.classId?.name));
  schedules.forEach(s => addClass(s.classId?._id, s.classId?.name));

  // Unique Subject filter options from results & schedules
  const uniqueSubjects = [];
  const seenSubjects = new Set();

  const addSubject = (sid, sname) => {
    if (sid && !seenSubjects.has(sid)) {
      seenSubjects.add(sid);
      uniqueSubjects.push({ id: sid, name: sname || 'N/A' });
    }
  };

  results.forEach(r => addSubject(r.examScheduleId?.subjectId?._id, r.examScheduleId?.subjectId?.name));
  schedules.forEach(s => addSubject(s.subjectId?._id, s.subjectId?.name));

  // Auto-select first class & subject if not selected
  useEffect(() => {
    if (!selectedClassId && uniqueClasses.length > 0) setSelectedClassId(uniqueClasses[0].id);
    if (!selectedSubjectId && uniqueSubjects.length > 0) setSelectedSubjectId(uniqueSubjects[0].id);
  }, [uniqueClasses.length, uniqueSubjects.length, selectedClassId, selectedSubjectId]);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(resultSchema),
    defaultValues: { status: 'PASS' }
  });

  // Watch the selected exam schedule to filter students by class
  const watchedScheduleId = useWatch({ control, name: 'examScheduleId' });
  const selectedSchedule = schedules.find(s => s._id === watchedScheduleId);
  const selectedScheduleClassId = selectedSchedule?.classId?._id || selectedSchedule?.classId;

  // Filter students to only those in the class of the selected schedule
  const studentOptions = students
    .filter(s => {
      if (!selectedScheduleClassId) return true; // show all if no schedule picked yet
      const studentClassId = s.classId?._id || s.classId;
      return studentClassId?.toString() === selectedScheduleClassId?.toString();
    })
    .map(s => ({ value: s._id, label: s.name }));

  // Bulk modal: filter students by the class of the selected bulk schedule
  const bulkSelectedSchedule = schedules.find(s => s._id === bulkScheduleId);
  const bulkClassId = bulkSelectedSchedule?.classId?._id || bulkSelectedSchedule?.classId;
  const bulkStudentOptions = students
    .filter(s => {
      if (!bulkClassId) return true;
      const studentClassId = s.classId?._id || s.classId;
      return studentClassId?.toString() === bulkClassId?.toString();
    })
    .map(s => ({ value: s._id, label: s.name }));

  const handleOpenCreate = () => {
    setEditingResult(null);
    reset({ studentId: '', examScheduleId: '', marksObtained: 0, remarks: '', status: 'PASS' });
    setModalOpen(true);
  };

  const handleOpenEdit = (resObj) => {
    setEditingResult(resObj);
    reset({
      studentId:       resObj.studentId?._id,
      examScheduleId:  resObj.examScheduleId?._id,
      marksObtained:   resObj.marksObtained,
      remarks:         resObj.remarks || '',
      status:          resObj.status,
    });
    setModalOpen(true);
  };

  const onSubmit = async (data) => {
    const selectedSched = schedules.find(s => s._id === data.examScheduleId);
    if (selectedSched && data.marksObtained > selectedSched.totalMarks) {
      toast.error(`Marks obtained cannot exceed total marks (${selectedSched.totalMarks})`);
      return;
    }
    try {
      if (editingResult) {
        await updateResult({ id: editingResult._id, ...data }).unwrap();
        toast.success('Result entry updated successfully!');
      } else {
        await createResult(data).unwrap();
        toast.success('Result entry recorded successfully!');
      }
      setModalOpen(false);
      setEditingResult(null);
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to save result');
    }
  };

  // ── Bulk Modal Handlers ───────────────────────────────────────────────────
  const handleOpenBulk = () => {
    setBulkScheduleId('');
    setBulkRows([emptyRow()]);
    setBulkModalOpen(true);
  };

  const handleBulkRowChange = (idx, field, value) => {
    setBulkRows(prev => prev.map((row, i) => i === idx ? { ...row, [field]: value } : row));
  };

  const handleAddBulkRow = () => setBulkRows(prev => [...prev, emptyRow()]);
  const handleRemoveBulkRow = (idx) => {
    if (bulkRows.length === 1) return;
    setBulkRows(prev => prev.filter((_, i) => i !== idx));
  };

  const handleBulkSubmit = async () => {
    if (!bulkScheduleId) { toast.error('Please select an exam schedule.'); return; }
    const invalidRows = bulkRows.filter(r => !r.studentId || r.marksObtained === '');
    if (invalidRows.length > 0) { toast.error('All rows must have a student and marks.'); return; }

    const selectedSched = schedules.find(s => s._id === bulkScheduleId);
    const overMax = bulkRows.find(r => selectedSched && Number(r.marksObtained) > selectedSched.totalMarks);
    if (overMax) {
      toast.error(`Marks exceed the total (${selectedSched.totalMarks}) for this schedule.`);
      return;
    }

    const payload = {
      examScheduleId: bulkScheduleId,
      results: bulkRows.map(r => ({
        studentId:     r.studentId,
        marksObtained: Number(r.marksObtained),
        status:        r.status || 'PASS',
        remarks:       r.remarks || undefined,
      })),
    };

    try {
      const res = await bulkUploadResults(payload).unwrap();
      toast.success(`Bulk upload complete! ${res?.data?.created ?? ''} created, ${res?.data?.updated ?? ''} updated.`);
      setBulkModalOpen(false);
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || 'Bulk upload failed');
    }
  };

  // ── Filters ───────────────────────────────────────────────────────────────
  const filteredResults = results.filter(r =>
    (!selectedClassId   || r.classId?._id === selectedClassId) &&
    (!selectedSubjectId || r.examScheduleId?.subjectId?._id === selectedSubjectId)
  );

  // Statistics
  const totalStudents = filteredResults.length;
  const avgScore  = totalStudents > 0 ? Math.round(filteredResults.reduce((sum, r) => sum + r.marksObtained, 0) / totalStudents) : 0;
  const passCount = filteredResults.filter(r => r.status === 'PASS').length;
  const passRate  = totalStudents > 0 ? Math.round((passCount / totalStudents) * 100) : 0;

  const gradeCounts = {};
  filteredResults.forEach(r => { if (r.grade) gradeCounts[r.grade] = (gradeCounts[r.grade] || 0) + 1; });

  let cumulativeOffset = 0;
  const donutSegments = Object.entries(gradeCounts).map(([grade, count]) => {
    const percent = Math.round((count / totalStudents) * 100);
    const offset  = cumulativeOffset;
    cumulativeOffset += percent;
    return { grade, count, percent, offset };
  });

  const currentClassName  = uniqueClasses.find(c => c.id === selectedClassId)?.name  || 'N/A';
  const currentSubjectName = uniqueSubjects.find(s => s.id === selectedSubjectId)?.name || 'N/A';

  const totalPages      = Math.ceil(filteredResults.length / itemsPerPage) || 1;
  const startIndex      = (currentPage - 1) * itemsPerPage;
  const paginatedResults = filteredResults.slice(startIndex, startIndex + itemsPerPage);

  // ── Publish All Unpublished Results in current filtered view ─────────────
  const [isPublishingAll, setIsPublishingAll] = useState(false);
  const handlePublishAll = async () => {
    const unpublished = filteredResults.filter(r => !r.isPublished);
    if (unpublished.length === 0) { toast('All results are already published.'); return; }
    setIsPublishingAll(true);
    let successCount = 0;
    let failCount = 0;
    for (const r of unpublished) {
      try { await publishResult(r._id).unwrap(); successCount++; }
      catch { failCount++; }
    }
    setIsPublishingAll(false);
    if (successCount > 0) toast.success(`${successCount} result(s) published!`);
    if (failCount > 0) toast.error(`${failCount} result(s) failed to publish.`);
    refetch();
  };

  return (
    <div className="space-y-6">
      {/* ── Dynamic Institute Title Banner ── */}
      <div className="text-center py-4">
        <h1 className="text-3xl font-extrabold tracking-widest text-[var(--color-text-[var(--color-primary-pink)])] dark:text-white uppercase font-sans">
          {schoolName}
        </h1>
      </div>

      {/* ── Class / Subject Selectors ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl glass-card shadow-md">
        {/* Class */}
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-slate-55 dark:bg-slate-800/40 border border-black/5 dark:border-slate-700/60 hover:border-primary/50 transition-all">
          <School className="w-5 h-5 text-slate-400" />
          <div className="flex-1 flex items-center justify-between">
            <span className="text-sm font-semibold text-[var(--color-text-secondary)]">Class:</span>
            <select
              value={selectedClassId}
              onChange={(e) => { setSelectedClassId(e.target.value); setCurrentPage(1); }}
              className="bg-transparent border-0 text-[var(--color-text-[var(--color-primary-pink)])] text-sm font-bold focus:ring-0 cursor-pointer outline-none text-right py-0 pr-6"
            >
              {uniqueClasses.map(c => (
                <option key={c.id} value={c.id} className="bg-white dark:bg-slate-900 text-[var(--color-text-[var(--color-primary-pink)])]">{c.name}</option>
              ))}
              {uniqueClasses.length === 0 && <option value="">No Classes</option>}
            </select>
          </div>
        </div>

        {/* Subject */}
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-slate-55 dark:bg-slate-800/40 border border-black/5 dark:border-slate-700/60 hover:border-primary/50 transition-all">
          <BookOpen className="w-5 h-5 text-slate-400" />
          <div className="flex-1 flex items-center justify-between">
            <span className="text-sm font-semibold text-[var(--color-text-secondary)]">Subject:</span>
            <select
              value={selectedSubjectId}
              onChange={(e) => { setSelectedSubjectId(e.target.value); setCurrentPage(1); }}
              className="bg-transparent border-0 text-[var(--color-text-[var(--color-primary-pink)])] text-sm font-bold focus:ring-0 cursor-pointer outline-none text-right py-0 pr-6"
            >
              {uniqueSubjects.map(s => (
                <option key={s.id} value={s.id} className="bg-white dark:bg-slate-900 text-[var(--color-text-[var(--color-primary-pink)])]">{s.name}</option>
              ))}
              {uniqueSubjects.length === 0 && <option value="">No Subjects</option>}
            </select>
          </div>
        </div>
      </div>

      {/* ── Grading Sheet Container ── */}
      <div className="p-6 rounded-xl glass-card shadow-md">
        <h2 className="text-xl font-bold text-[var(--color-text-[var(--color-primary-pink)])] mb-6">
          Class {currentClassName} — {currentSubjectName} Grading Sheet
        </h2>

        {/* Statistics - Hidden for students/parents */}
        {!isViewOnly && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-center bg-slate-55 dark:bg-slate-950/40 p-5 rounded-xl border border-black/5 dark:border-white/5 mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white dark:bg-slate-800 border border-black/5 dark:border-slate-700 rounded-lg text-[var(--color-text-secondary)] shadow-xs">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">Total Students</p>
                <p className="text-lg font-bold text-[var(--color-text-[var(--color-primary-pink)])] dark:text-slate-200">({totalStudents})</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-3 bg-white dark:bg-slate-800 border border-black/5 dark:border-slate-700 rounded-lg text-[var(--color-text-secondary)] shadow-xs">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">Avg. Score</p>
                <p className="text-lg font-bold text-[var(--color-text-[var(--color-primary-pink)])] dark:text-slate-200">({avgScore})</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-3 bg-white dark:bg-slate-800 border border-black/5 dark:border-slate-700 rounded-lg text-[var(--color-text-secondary)] shadow-xs">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">Pass Rate</p>
                <p className="text-lg font-bold text-[var(--color-text-[var(--color-primary-pink)])] dark:text-slate-200">({passRate}%)</p>
              </div>
            </div>

            {/* Donut */}
            <div className="flex items-center gap-4 justify-end">
              <svg className="w-14 h-14 shrink-0" viewBox="0 0 40 40">
                <circle cx="20" cy="20" r="15.91549430918954" fill="transparent" stroke="currentColor"
                  className="text-slate-200 dark:text-[var(--color-text-[var(--color-primary-pink)])]" strokeWidth="6" />
                {donutSegments.map((seg, idx) => (
                  <circle
                    key={idx} cx="20" cy="20" r="15.91549430918954" fill="transparent"
                    stroke={getGradeColor(seg.grade)} strokeWidth="6"
                    strokeDasharray={`${seg.percent} 100`} strokeDashoffset={-seg.offset}
                    transform="rotate(-90 20 20)" className="transition-all duration-500 ease-out"
                  />
                ))}
              </svg>
              <div className="flex flex-col gap-0.5 max-h-[60px] overflow-y-auto pr-1">
                {donutSegments.map((seg, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 text-[10px] font-bold text-slate-650 dark:text-slate-350">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: getGradeColor(seg.grade) }} />
                    <span>{seg.grade}</span>
                  </div>
                ))}
                {donutSegments.length === 0 && <div className="text-[10px] text-[var(--color-text-secondary)] italic">No Grades</div>}
              </div>
            </div>
          </div>
        )}

        {/* Student Records */}
        {resultsLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-3">
            {paginatedResults.map((r) => {
              const isPublished = r.isPublished;
              return (
                <div
                  key={r._id}
                  className="flex flex-col lg:flex-row lg:items-center justify-between p-4 rounded-xl bg-white dark:bg-slate-800/10 hover:bg-[var(--color-primary-pink)]/5 dark:hover:bg-slate-800/20 border border-black/5 dark:border-white/5/80 hover:border-slate-300 dark:hover:border-slate-700/80 transition-all gap-4 shadow-2xs"
                >
                  <div className="flex items-center gap-4 min-w-[220px]">
                    <Avatar student={r.studentId} />
                    <div>
                      <h4 className="text-base font-bold text-[var(--color-text-[var(--color-primary-pink)])] leading-tight">
                        {r.studentId?.name || 'N/A'}
                      </h4>
                    </div>
                  </div>

                  <div className={`flex-1 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-${isViewOnly ? '4' : '5'} gap-4 items-center`}>
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 dark:text-[var(--color-text-secondary)] uppercase tracking-wider mb-0.5">Exam</span>
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 line-clamp-1">
                        {r.examScheduleId?.examId?.title || 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 dark:text-[var(--color-text-secondary)] uppercase tracking-wider mb-0.5">Marks</span>
                      <span className="text-sm font-bold text-[var(--color-text-[var(--color-primary-pink)])]">{r.marksObtained}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 dark:text-[var(--color-text-secondary)] uppercase tracking-wider mb-0.5">Grade</span>
                      <span className="text-sm font-black text-[var(--color-text-[var(--color-primary-pink)])]">{r.grade || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-extrabold flex items-center gap-1 border ${
                        r.status === 'PASS'
                          ? 'bg-emerald-500/10 text-[var(--color-status-success)] dark:text-emerald-400 border-emerald-500/20'
                          : 'bg-red-500/10 text-red-650 dark:text-red-400 border-red-500/20'
                      }`}>
                        {r.status === 'PASS' ? '✓ PASS' : '✗ FAIL'}
                      </span>
                      {r.status === 'PASS' ? (
                        <Check className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <X className="w-4 h-4 text-red-500" />
                      )}
                    </div>
                    {!isViewOnly && (
                      <div>
                        <span className="block text-[10px] font-bold text-slate-400 dark:text-[var(--color-text-secondary)] uppercase tracking-wider mb-0.5">Lock State</span>
                        <div className="flex items-center gap-1.5">
                          {isPublished ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 dark:text-[var(--color-text-secondary)]">
                              <Lock className="w-3.5 h-3.5" /> Locked
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-status-success)] dark:text-emerald-450">
                              <Edit2 className="w-3.5 h-3.5" /> Editable
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-end">
                    {!isViewOnly && (
                      <button
                        onClick={() => handleOpenEdit(r)}
                        disabled={isPublished}
                        className={`p-2 rounded-lg border transition-all ${
                          isPublished
                            ? 'border-black/5 dark:border-white/5 text-slate-300 dark:text-slate-650 bg-[var(--color-primary-pink)]/5 dark:bg-slate-900/25 cursor-not-allowed'
                            : 'border-blue-500/30 text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 hover:bg-blue-500/10 hover:border-blue-500/50'
                        }`}
                        title={isPublished ? 'Record is published and locked' : 'Edit Result Entry'}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {filteredResults.length === 0 && (
              <div className="text-center py-12 bg-white/5/10 border border-black/5 dark:border-white/5/60 rounded-xl">
                <Award className="w-12 h-12 text-slate-400 dark:text-[var(--color-text-secondary)] mx-auto mb-3 opacity-50" />
                <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-350 mb-1">No Result Records Found</h3>
                <p className="text-xs text-slate-400 dark:text-[var(--color-text-secondary)]">There are no grading records for this class and subject yet.</p>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-black/5 dark:border-white/5 flex-wrap gap-4">
          {/* Entries per page */}
          <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
            <span>Show</span>
            <select
              value={itemsPerPage}
              onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
              className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md px-2 py-1 text-sm font-medium text-slate-750 dark:text-slate-200 outline-none focus:ring-1 focus:ring-primary focus:border-primary cursor-pointer"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <span>entries</span>
          </div>

          {/* Pagination */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 text-xs font-semibold rounded-md border border-black/5 dark:border-slate-700/80 disabled:opacity-50 hover:bg-[var(--color-primary-pink)]/5 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-300 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-xs font-bold text-[var(--color-text-secondary)] select-none">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-xs font-semibold rounded-md border border-black/5 dark:border-slate-700/80 disabled:opacity-50 hover:bg-slate-55 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-300 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>

          {/* Action Buttons — hidden for students/parents */}
          {!isViewOnly && (
            <div className="flex items-center gap-2">
              <Button
                onClick={handlePublishAll}
                isLoading={isPublishingAll}
                variant="outline"
                className="gap-2 flex items-center border-emerald-500/40 text-[var(--color-status-success)] dark:text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/60"
              >
                <Lock className="w-4 h-4" />
                <span>Publish All Results</span>
              </Button>
              <Button
                onClick={handleOpenBulk}
                variant="outline"
                className="gap-2 flex items-center border-violet-500/40 text-violet-600 dark:text-violet-400 hover:bg-violet-500/10 hover:border-violet-500/60"
              >
                <Layers className="w-4 h-4" />
                <span>Bulk Record</span>
              </Button>
              <Button onClick={handleOpenCreate} className="gap-2 flex items-center">
                <Plus className="w-4 h-4" />
                <span>Add Result Record</span>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          Single Result Modal
      ══════════════════════════════════════════════════════════════════════ */}
      <Modal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditingResult(null); }}
        title={editingResult ? 'Edit Result Record' : 'Record Result Entry'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Select
            id="examScheduleId"
            label="Exam Schedule Slot"
            required
            options={scheduleOptions}
            placeholder="Select Schedule Slot"
            error={errors.examScheduleId}
            className={editingResult ? 'pointer-events-none opacity-60' : ''}
            tabIndex={editingResult ? -1 : undefined}
            {...register('examScheduleId')}
          />
          <Select
            id="studentId"
            label="Student"
            required
            options={studentOptions}
            placeholder="Select Student"
            error={errors.studentId}
            className={editingResult ? 'pointer-events-none opacity-60' : ''}
            tabIndex={editingResult ? -1 : undefined}
            {...register('studentId')}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input id="marksObtained" label="Marks Obtained" type="number" required error={errors.marksObtained} {...register('marksObtained')} />
            <Select
              id="status"
              label="Grade Status"
              required
              options={[
                { value: 'PASS',       label: 'Pass' },
                { value: 'FAIL',       label: 'Fail' },
                { value: 'ABSENT',     label: 'Absent' },
                { value: 'WITHHELD',   label: 'Withheld' },
                { value: 'INCOMPLETE', label: 'Incomplete' },
              ]}
              error={errors.status}
              {...register('status')}
            />
          </div>
          <Input id="remarks" label="Remarks" placeholder="e.g. Excellent presentation" error={errors.remarks} {...register('remarks')} />
          <div className="flex justify-end gap-2 pt-4 border-t border-black/5 dark:border-white/5">
            <Button type="button" onClick={() => { setModalOpen(false); setEditingResult(null); }} variant="outline">Cancel</Button>
            <Button type="submit" isLoading={isCreating || isUpdating}>
              {editingResult ? 'Update Result' : 'Submit Result'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ══════════════════════════════════════════════════════════════════════
          Bulk Result Modal
      ══════════════════════════════════════════════════════════════════════ */}
      <Modal
        isOpen={bulkModalOpen}
        onClose={() => setBulkModalOpen(false)}
        title="Bulk Record Results"
      >
        <div className="space-y-5">
          {/* Step 1 — pick schedule */}
          <div>
            <label className="block text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-1.5">
              Exam Schedule Slot <span className="text-red-500">*</span>
            </label>
            <select
              value={bulkScheduleId}
              onChange={(e) => setBulkScheduleId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-[var(--color-text-[var(--color-primary-pink)])] text-sm px-3 py-2 outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
            >
              <option value="">— Select a schedule slot —</option>
              {scheduleOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Step 2 — student rows */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                Student Records
              </label>
              <button
                type="button"
                onClick={handleAddBulkRow}
                className="flex items-center gap-1 text-xs font-semibold text-[var(--color-primary-pink)] hover:text-[var(--color-primary-pink)]/80 transition"
              >
                <Plus className="w-3.5 h-3.5" /> Add Row
              </button>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {bulkRows.map((row, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-12 gap-2 items-center p-2 rounded-lg bg-white/5/40 border border-black/5 dark:border-slate-700/60"
                >
                  {/* Student */}
                  <div className="col-span-4">
                    <select
                      value={row.studentId}
                      onChange={(e) => handleBulkRowChange(idx, 'studentId', e.target.value)}
                      className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-[var(--color-text-[var(--color-primary-pink)])] text-xs px-2 py-1.5 outline-none focus:ring-1 focus:ring-primary/40"
                    >
                      <option value="">Student…</option>
                      {bulkStudentOptions.map(s => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Marks */}
                  <div className="col-span-2">
                    <input
                      type="number"
                      min="0"
                      placeholder="Marks"
                      value={row.marksObtained}
                      onChange={(e) => handleBulkRowChange(idx, 'marksObtained', e.target.value)}
                      className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-[var(--color-text-[var(--color-primary-pink)])] text-xs px-2 py-1.5 outline-none focus:ring-1 focus:ring-primary/40"
                    />
                  </div>

                  {/* Status */}
                  <div className="col-span-3">
                    <select
                      value={row.status}
                      onChange={(e) => handleBulkRowChange(idx, 'status', e.target.value)}
                      className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-[var(--color-text-[var(--color-primary-pink)])] text-xs px-2 py-1.5 outline-none focus:ring-1 focus:ring-primary/40"
                    >
                      {VALID_STATUSES.map(s => (
                        <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>
                      ))}
                    </select>
                  </div>

                  {/* Remarks */}
                  <div className="col-span-2">
                    <input
                      type="text"
                      placeholder="Remarks"
                      value={row.remarks}
                      onChange={(e) => handleBulkRowChange(idx, 'remarks', e.target.value)}
                      className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-[var(--color-text-[var(--color-primary-pink)])] text-xs px-2 py-1.5 outline-none focus:ring-1 focus:ring-primary/40"
                    />
                  </div>

                  {/* Remove */}
                  <div className="col-span-1 flex justify-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveBulkRow(idx)}
                      disabled={bulkRows.length === 1}
                      className="p-1 rounded text-red-400 hover:text-[var(--color-status-error)] hover:bg-red-500/10 transition disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Remove row"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-[11px] text-slate-400 dark:text-[var(--color-text-secondary)] mt-2">
              {bulkRows.length} student{bulkRows.length !== 1 ? 's' : ''} in this batch
            </p>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 pt-4 border-t border-black/5 dark:border-white/5">
            <Button type="button" onClick={() => setBulkModalOpen(false)} variant="outline">Cancel</Button>
            <Button
              type="button"
              onClick={handleBulkSubmit}
              isLoading={isBulking}
              className="gap-2"
            >
              <Layers className="w-4 h-4" />
              Submit Bulk ({bulkRows.length})
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
