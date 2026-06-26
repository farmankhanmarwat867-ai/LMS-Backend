import React, { useState, useMemo } from 'react';
import {
  useGetEnrollmentsQuery,
  useCreateEnrollmentMutation,
  useBulkEnrollStudentsMutation,
  useUpdateEnrollmentStatusMutation,
  useDeleteEnrollmentMutation,
  useGetCoursesQuery,
  useGetUsersQuery,
  useGetClassesQuery,
} from '../../app/api/coreApiSlice';
import Button from '../../components/common/Button';
import Table from '../../components/common/Table';
import Select from '../../components/common/Select';
import Modal from '../../components/common/Modal';
import ConfirmModal from '../../components/common/ConfirmModal';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'react-hot-toast';
import {
  Plus, Trash2, Edit, Users, BookOpen,
  CheckCircle2, XCircle, Search, ChevronRight,
  GraduationCap, X, AlertTriangle
} from 'lucide-react';

const enrollSchema = z.object({
  studentId: z.string().min(1, 'Student selection is required'),
  courseId: z.string().min(1, 'Subject selection is required'),
});

export default function EnrollmentsPage() {
  const [modalOpen, setModalOpen]           = useState(false);
  const [bulkModalOpen, setBulkModalOpen]   = useState(false);
  const [editingEnrollment, setEditingEnrollment] = useState(null);
  const [newStatus, setNewStatus]           = useState('ACTIVE');
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [enrollmentToDelete, setEnrollmentToDelete] = useState(null);

  const { data: response, isLoading, refetch } = useGetEnrollmentsQuery();
  const { data: coursesResponse } = useGetCoursesQuery({ limit: 100 });

  const [createEnrollment, { isLoading: isCreating }]   = useCreateEnrollmentMutation();
  const [bulkEnroll, { isLoading: isBulkEnrolling }]    = useBulkEnrollStudentsMutation();
  const [updateStatus, { isLoading: isUpdatingStatus }] = useUpdateEnrollmentStatusMutation();
  const [deleteEnrollment, { isLoading: isDeleting }]   = useDeleteEnrollmentMutation();

  const enrollments    = response?.data || [];
  const courses        = coursesResponse?.data || [];
  const courseOptions = courses.map(c => {
    const className = c.classId?.name ? `Class ${c.classId.name}` : '';
    const sectionName = c.sectionId?.name ? `(Sec ${c.sectionId.name})` : '';
    const subjectName = c.subjectId?.name || c.title || 'Unknown Subject';
    const label = className ? `${className} ${sectionName} - ${subjectName}` : subjectName;
    return { value: c._id, label: label.trim() };
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(enrollSchema),
  });

  // For single-enroll modal: fetch students inline (only when that modal is open)
  const { data: singleStudentsRes } = useGetUsersQuery({ role: 'STUDENT', limit: 500 }, { skip: !modalOpen });
  const singleStudents = (() => {
    const d = singleStudentsRes?.data;
    if (Array.isArray(d)) return d;
    if (Array.isArray(d?.docs)) return d.docs;
    return [];
  })();
  const studentOptions = singleStudents.map(s => ({ value: s._id, label: s.name }));

  // ── Single Enroll ──────────────────────────────────────────────────────────
  const handleOpenCreate = () => { reset({ studentId: '', courseId: '' }); setModalOpen(true); };

  const onSubmit = async (data) => {
    try {
      await createEnrollment(data).unwrap();
      toast.success('Student enrolled successfully!');
      setModalOpen(false);
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to enroll student');
    }
  };

  // ── Status Edit ────────────────────────────────────────────────────────────
  const handleOpenStatusEdit = (enroll) => { setEditingEnrollment(enroll); setNewStatus(enroll.status); setStatusModalOpen(true); };

  const handleSaveStatus = async () => {
    try {
      await updateStatus({ id: editingEnrollment._id, status: newStatus }).unwrap();
      toast.success('Enrollment status updated!');
      setStatusModalOpen(false);
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to update status');
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleOpenDelete = (enroll) => {
    setEnrollmentToDelete(enroll);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!enrollmentToDelete) return;
    try {
      await deleteEnrollment(enrollmentToDelete._id).unwrap();
      toast.success('Enrollment deleted successfully!');
      setDeleteModalOpen(false);
      setEnrollmentToDelete(null);
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || 'Delete failed');
    }
  };

  // ── Table Columns ──────────────────────────────────────────────────────────
  const columns = [
    {
      header: 'Student Name',
      accessorKey: 'studentId.name',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-[var(--color-primary-pink)]/10 flex items-center justify-center text-xs font-bold text-[var(--color-primary-pink)] shrink-0">
            {row.original.studentId?.name?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <span className="font-semibold text-[var(--color-text-[var(--color-primary-pink)])] dark:text-slate-200">
            {row.original.studentId?.name || 'N/A'}
          </span>
        </div>
      ),
    },
    { header: 'Subject Code',  accessorKey: 'courseId.code',  cell: ({ row }) => <span className="font-mono text-xs font-bold text-[var(--color-text-secondary)] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">{row.original.courseId?.code || 'N/A'}</span> },
    { header: 'Subject Title', accessorKey: 'courseId.title', cell: ({ row }) => row.original.courseId?.title || 'N/A' },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: ({ getValue }) => {
        const val = getValue();
        const cfg = {
          ACTIVE:    { cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400', dot: 'bg-emerald-500' },
          DROPPED:   { cls: 'bg-red-100 text-red-800 dark:bg-red-950/30 dark:text-red-400',               dot: 'bg-red-500' },
          COMPLETED: { cls: 'bg-blue-100 text-blue-800 dark:bg-blue-950/30 dark:text-blue-400',           dot: 'bg-blue-500' },
        }[val] || { cls: 'bg-slate-100 text-[var(--color-text-secondary)]', dot: 'bg-slate-400' };
        return (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${cfg.cls}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            {val}
          </span>
        );
      },
    },
    {
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button onClick={() => handleOpenStatusEdit(row.original)} variant="secondary" size="sm" className="gap-1">
            <Edit className="w-3.5 h-3.5" /><span>Status</span>
          </Button>
          <Button onClick={() => handleOpenDelete(row.original)} variant="danger" size="sm">
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 items-start">
        <div>
          <h2 className="text-xl font-bold text-[var(--color-text-[var(--color-primary-pink)])]">Subject Enrollments</h2>
          <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">{enrollments.length} total enrollments</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => setBulkModalOpen(true)} variant="outline" className="gap-2">
            <Users className="w-4 h-4" />
            <span>Bulk Enroll</span>
          </Button>
          <Button onClick={handleOpenCreate} className="gap-2">
            <Plus className="w-4 h-4" />
            <span>New Enrollment</span>
          </Button>
        </div>
      </div>

      <Table columns={columns} data={enrollments} isLoading={isLoading} />

      {/* Single Enroll Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Enroll Student in Subject">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Select id="studentId" label="Select Student" required options={studentOptions} placeholder="Select Student" error={errors.studentId} {...register('studentId')} />
          <Select id="courseId"  label="Select Class & Subject"  required options={courseOptions}  placeholder="Select Class & Subject"  error={errors.courseId}  {...register('courseId')} />
          <div className="flex justify-end gap-2 pt-4 border-t border-black/5 dark:border-white/5">
            <Button onClick={() => setModalOpen(false)} variant="outline">Cancel</Button>
            <Button type="submit" isLoading={isCreating}>Enroll Student</Button>
          </div>
        </form>
      </Modal>

      {/* Status Edit Modal */}
      <Modal isOpen={statusModalOpen} onClose={() => setStatusModalOpen(false)} title="Change Enrollment Status">
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Updating enrollment for <strong>{editingEnrollment?.studentId?.name}</strong> in <strong>{editingEnrollment?.courseId?.title}</strong>
          </p>
          <Select
            id="newEnrollStatus"
            label="Select Status"
            options={[
              { value: 'ACTIVE',    label: 'Active' },
              { value: 'DROPPED',   label: 'Dropped' },
              { value: 'COMPLETED', label: 'Completed' },
            ]}
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
          />
          <div className="flex justify-end gap-2 pt-4">
            <Button onClick={() => setStatusModalOpen(false)} variant="outline">Cancel</Button>
            <Button onClick={handleSaveStatus} isLoading={isUpdatingStatus}>Update Status</Button>
          </div>
        </div>
      </Modal>

      {/* Custom Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Confirm Delete"
        message={
          <div>
            <h4 className="font-bold text-red-800 dark:text-red-300 mb-1">Are you sure you want to delete this enrollment?</h4>
            <p className="text-red-700/80 dark:text-red-400/80">
              You are about to delete the enrollment for <strong className="text-red-900 dark:text-red-200">{enrollmentToDelete?.studentId?.name}</strong> in the subject <strong className="text-red-900 dark:text-red-200">{enrollmentToDelete?.courseId?.title}</strong>. This action is permanent and cannot be undone.
            </p>
          </div>
        }
        confirmText="Delete Enrollment"
        isLoading={isDeleting}
      />

      {/* Bulk Enroll Modal */}
      <BulkEnrollModal
        isOpen={bulkModalOpen}
        onClose={() => setBulkModalOpen(false)}
        courses={courses}
        bulkEnroll={bulkEnroll}
        isBulkEnrolling={isBulkEnrolling}
        onSuccess={() => { setBulkModalOpen(false); refetch(); }}
      />
    </div>
  );
}

// ─── Bulk Enroll Modal ─────────────────────────────────────────────────────────
function BulkEnrollModal({ isOpen, onClose, courses, bulkEnroll, isBulkEnrolling, onSuccess }) {
  const [step, setStep]             = useState('configure');
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [filterClassId, setFilterClassId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState(new Set());
  const [results, setResults]       = useState(null);

  // Fetch students and classes ONLY when the modal is open
  const { data: studentsRes, isLoading: isLoadingStudents } = useGetUsersQuery(
    { role: 'STUDENT', limit: 500 },
    { skip: !isOpen }
  );
  const { data: classesRes } = useGetClassesQuery({ limit: 100 }, { skip: !isOpen });

  // Robustly extract array regardless of response shape
  const studentList = useMemo(() => {
    if (!studentsRes) return [];
    const d = studentsRes?.data;
    if (Array.isArray(d)) return d;
    if (d && Array.isArray(d.docs)) return d.docs;
    if (d && Array.isArray(d.data)) return d.data;
    return [];
  }, [studentsRes]);

  const classes = classesRes?.data || [];

  const selectedCourse = courses.find(c => c._id === selectedCourseId);

  // Filter students by class and search
  const filteredStudents = useMemo(() => {
    let list = studentList;
    if (filterClassId) {
      list = list.filter(s => {
        const cid = s.classId?._id?.toString() || s.classId?.toString() || '';
        return cid === filterClassId;
      });
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(s =>
        s.name?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [studentList, filterClassId, searchTerm]);

  const allFilteredSelected = filteredStudents.length > 0 && filteredStudents.every(s => selectedStudentIds.has(s._id));

  const toggleStudent = (id) => {
    setSelectedStudentIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (allFilteredSelected) {
      setSelectedStudentIds(prev => {
        const next = new Set(prev);
        filteredStudents.forEach(s => next.delete(s._id));
        return next;
      });
    } else {
      setSelectedStudentIds(prev => {
        const next = new Set(prev);
        filteredStudents.forEach(s => next.add(s._id));
        return next;
      });
    }
  };

  const handleEnroll = async () => {
    if (!selectedCourseId) { toast.error('Please select a class & subject'); return; }
    if (selectedStudentIds.size === 0) { toast.error('Please select at least one student'); return; }

    try {
      const res = await bulkEnroll({ courseId: selectedCourseId, studentIds: [...selectedStudentIds] }).unwrap();
      setResults(res.data || res);
      setStep('results');
      if ((res.data?.successful || res.successful || []).length > 0) {
        toast.success(`${(res.data?.successful || res.successful).length} students enrolled!`);
        onSuccess();
      }
    } catch (err) {
      toast.error(err?.data?.message || 'Bulk enrollment failed');
    }
  };

  const handleClose = () => {
    setStep('configure');
    setSelectedCourseId('');
    setFilterClassId('');
    setSearchTerm('');
    setSelectedStudentIds(new Set());
    setResults(null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Bulk Enroll Students" size="xl">
      <div className="space-y-5">

        {/* Step Pills */}
        <div className="flex items-center gap-2 text-xs font-semibold">
          {[['configure','1. Select Subject & Students'], ['confirm','2. Confirm'], ['results','3. Results']].map(([s, label], idx) => (
            <React.Fragment key={s}>
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all ${step === s ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                {label}
              </div>
              {idx < 2 && <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />}
            </React.Fragment>
          ))}
        </div>

        {/* ── Step 1: Configure ── */}
        {step === 'configure' && (
          <div className="space-y-4">
            {/* Course Selector */}
            <div>
              <label className="block text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider mb-2">
                Select Class & Subject <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedCourseId}
                onChange={e => setSelectedCourseId(e.target.value)}
                className="w-full px-3 py-2.5 bg-white dark:bg-slate-950 border border-black/5 dark:border-white/5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="">— Select a class and subject to enroll into —</option>
                {courses.map(c => {
                  const className = c.classId?.name ? `Class ${c.classId.name}` : '';
                  const sectionName = c.sectionId?.name ? `(Sec ${c.sectionId.name})` : '';
                  const subjectName = c.subjectId?.name || c.title || 'Unknown Subject';
                  const label = className ? `${className} ${sectionName} - ${subjectName}` : subjectName;
                  return <option key={c._id} value={c._id}>{label.trim()}</option>
                })}
              </select>
              {selectedCourse && (
                <div className="mt-2 flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
                  <BookOpen className="w-4 h-4 text-[var(--color-primary-pink)] shrink-0" />
                  <span className="text-sm font-semibold text-[var(--color-primary-pink)]">{selectedCourse.title}</span>
                  <span className="text-xs text-slate-400">({selectedCourse.code})</span>
                </div>
              )}
            </div>

            {/* Student Filters */}
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-950 border border-black/5 dark:border-white/5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <select
                value={filterClassId}
                onChange={e => setFilterClassId(e.target.value)}
                className="px-3 py-2 bg-white dark:bg-slate-950 border border-black/5 dark:border-white/5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="">All Classes</option>
                {classes.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
            </div>

            {/* Student Selection Table */}
            <div className="border border-black/5 dark:border-white/5 rounded-xl overflow-hidden">
              {/* Table Header */}
              <div className="grid grid-cols-12 items-center px-4 py-2.5 bg-white/5/60 border-b border-black/5 dark:border-slate-700">
                <div className="col-span-1">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={toggleAll}
                    className="w-4 h-4 rounded border-slate-300 accent-primary cursor-pointer"
                    title="Select all visible"
                  />
                </div>
                <div className="col-span-5 text-xs font-bold text-slate-400 uppercase tracking-wider">Student</div>
                <div className="col-span-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Email</div>
                <div className="col-span-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Class</div>
              </div>

              {/* Student Rows */}
              <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                {isLoadingStudents ? (
                  <div className="flex flex-col items-center py-10 text-slate-400">
                    <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mb-3" />
                    <p className="text-sm font-semibold">Loading students...</p>
                  </div>
                ) : filteredStudents.length === 0 ? (
                  <div className="flex flex-col items-center py-10 text-slate-400">
                    <GraduationCap className="w-8 h-8 mb-2" />
                    <p className="text-sm font-semibold">
                      {filterClassId ? 'No students in selected class' : studentList.length === 0 ? 'No students registered yet' : 'No students match your search'}
                    </p>
                    {filterClassId && studentList.length > 0 && (
                      <button onClick={() => setFilterClassId('')} className="mt-2 text-xs text-[var(--color-primary-pink)] font-semibold hover:underline">
                        Show all {studentList.length} students
                      </button>
                    )}
                  </div>
                ) : (
                  filteredStudents.map(s => {
                    const checked = selectedStudentIds.has(s._id);
                    return (
                      <div
                        key={s._id}
                        onClick={() => toggleStudent(s._id)}
                        className={`grid grid-cols-12 items-center px-4 py-3 cursor-pointer transition-colors ${checked ? 'bg-primary/5 dark:bg-[var(--color-primary-pink)]/10' : 'hover:bg-[var(--color-primary-pink)]/5 dark:hover:bg-slate-800/30'}`}
                      >
                        <div className="col-span-1">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleStudent(s._id)}
                            onClick={e => e.stopPropagation()}
                            className="w-4 h-4 rounded border-slate-300 accent-primary cursor-pointer"
                          />
                        </div>
                        <div className="col-span-5 flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${checked ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-800 text-[var(--color-text-secondary)]'}`}>
                            {s.name?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <span className={`text-sm font-semibold ${checked ? 'text-[var(--color-primary-pink)]' : 'text-[var(--color-text-[var(--color-primary-pink)])] dark:text-slate-200'}`}>{s.name}</span>
                        </div>
                        <div className="col-span-3 text-xs text-slate-400 truncate">{s.email}</div>
                        <div className="col-span-3 text-xs text-[var(--color-text-secondary)]">{s.classId?.name || '—'}</div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer count */}
              <div className="px-4 py-2.5 bg-white/5/40 border-t border-black/5 dark:border-slate-700 flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  {filteredStudents.length} of {studentList.length} student{studentList.length !== 1 ? 's' : ''} shown
                  {filterClassId && ` (filtered by class)`}
                </span>
                {selectedStudentIds.size > 0 && (
                  <span className="text-xs font-bold text-[var(--color-primary-pink)] bg-[var(--color-primary-pink)]/10 px-2 py-0.5 rounded-full">
                    {selectedStudentIds.size} selected
                  </span>
                )}
              </div>
            </div>

            {/* Selected pills */}
            {selectedStudentIds.size > 0 && (
              <div className="flex flex-wrap gap-2">
                {[...selectedStudentIds].map(id => {
                  const s = studentList.find(st => st._id === id);
                  return s ? (
                    <span key={id} className="inline-flex items-center gap-1.5 bg-[var(--color-primary-pink)]/10 text-[var(--color-primary-pink)] text-xs font-semibold px-2.5 py-1 rounded-full">
                      {s.name}
                      <button onClick={() => toggleStudent(id)} className="hover:text-red-500 transition-colors">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ) : null;
                })}
              </div>
            )}

            {/* Action */}
            <div className="flex items-center justify-between pt-2 border-t border-black/5 dark:border-white/5">
              <span className="text-sm text-[var(--color-text-secondary)]">
                {selectedStudentIds.size} student{selectedStudentIds.size !== 1 ? 's' : ''} selected
              </span>
              <Button
                onClick={() => {
                  if (!selectedCourseId) { toast.error('Select a class & subject first'); return; }
                  if (selectedStudentIds.size === 0) { toast.error('Select at least one student'); return; }
                  setStep('confirm');
                }}
                className="gap-2"
                disabled={!selectedCourseId || selectedStudentIds.size === 0}
              >
                Review & Confirm <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 2: Confirm ── */}
        {step === 'confirm' && (
          <div className="space-y-4">
            {/* Summary card */}
            <div className="bg-gradient-to-br from-primary/5 to-violet-500/5 border border-primary/20 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--color-primary-pink)]/10 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-[var(--color-primary-pink)]" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Subject</p>
                  <p className="font-bold text-[var(--color-text-[var(--color-primary-pink)])]">{selectedCourse?.title}</p>
                  <p className="text-xs font-mono text-slate-400">{selectedCourse?.code}</p>
                </div>
              </div>
              <div className="border-t border-primary/10 pt-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                  <Users className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Students to Enroll</p>
                  <p className="text-2xl font-black text-[var(--color-text-[var(--color-primary-pink)])]">{selectedStudentIds.size}</p>
                </div>
              </div>
            </div>

            {/* Student list preview */}
            <div className="max-h-52 overflow-y-auto space-y-1.5">
              {[...selectedStudentIds].map(id => {
                const s = studentList.find(st => st._id === id);
                return s ? (
                  <div key={id} className="flex items-center justify-between bg-white/5/40 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[var(--color-primary-pink)]/10 flex items-center justify-center text-xs font-bold text-[var(--color-primary-pink)]">
                        {s.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{s.name}</span>
                    </div>
                    <span className="text-xs text-slate-400">{s.classId?.name || '—'}</span>
                  </div>
                ) : null;
              })}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-black/5 dark:border-white/5">
              <button onClick={() => setStep('configure')} className="text-sm text-[var(--color-text-secondary)] hover:text-slate-700 dark:hover:text-slate-300 font-semibold">
                ← Back
              </button>
              <Button onClick={handleEnroll} isLoading={isBulkEnrolling} className="gap-2">
                <Users className="w-4 h-4" />
                Enroll {selectedStudentIds.size} Students
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 3: Results ── */}
        {step === 'results' && results && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4 text-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-3xl font-black text-[var(--color-status-success)] dark:text-emerald-400">
                  {(results.successful || []).length}
                </p>
                <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300 mt-1">Successfully Enrolled</p>
              </div>
              <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-2xl p-4 text-center">
                <XCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
                <p className="text-3xl font-black text-red-500">
                  {(results.failed || []).length}
                </p>
                <p className="text-sm font-semibold text-[var(--color-status-error)] dark:text-red-400 mt-1">Failed / Skipped</p>
              </div>
            </div>

            {results.failed?.length > 0 && (
              <div className="border border-red-200 dark:border-red-800 rounded-xl overflow-hidden">
                <div className="bg-red-50 dark:bg-red-950/30 px-4 py-2 text-xs font-bold text-[var(--color-status-error)] uppercase tracking-wider">
                  Failed Enrollments
                </div>
                <div className="max-h-48 overflow-y-auto divide-y divide-red-100 dark:divide-red-900/40">
                  {results.failed.map((f, i) => {
                    const s = studentList.find(st => st._id === f.studentId);
                    return (
                      <div key={i} className="px-4 py-2.5 flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-xs font-bold text-red-500">
                            {s?.name?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <span className="font-semibold text-slate-700 dark:text-slate-300">{s?.name || f.studentId}</span>
                        </div>
                        <span className="text-red-500 text-xs font-semibold ml-4">{f.reason}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <Button onClick={handleClose}>Done</Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
