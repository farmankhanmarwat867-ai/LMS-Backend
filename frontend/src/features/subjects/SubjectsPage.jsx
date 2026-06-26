import React, { useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { selectCurrentUser, selectTenantContext } from '../../app/authSlice';
import {
  useGetSubjectsQuery,
  useCreateSubjectMutation,
  useUpdateSubjectMutation,
  useDeleteSubjectMutation,
  useGetBranchesQuery,
  useGetClassesQuery,
  useGetSectionsQuery,
  useGetUsersQuery
} from '../../app/api/coreApiSlice';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import Modal from '../../components/common/Modal';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'react-hot-toast';
import {
  Plus, Edit2, Trash2, BookOpen, User,
  GraduationCap, Search, LayersIcon, ChevronRight
} from 'lucide-react';

const subjectSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  code: z.string().min(1, 'Subject code is required'),
  branchId: z.string().min(1, 'Branch is required'),
  classId: z.string().optional().nullable(),
  sectionId: z.string().optional().nullable(),
  teacherId: z.string().optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE']),
});

// Avatar color generator
const avatarColors = [
  'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400',
  'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
  'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400',
  'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-400',
  'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-400',
  'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400',
];
const subjectIcons = ['📐', '📖', '🔬', '🌍', '📊', '🎨', '⚗️', '📝', '💡', '🏛️'];
function getColor(str) { let h = 0; for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h); return avatarColors[Math.abs(h) % avatarColors.length]; }
function getIcon(str) { let h = 0; for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h); return subjectIcons[Math.abs(h) % subjectIcons.length]; }

export default function SubjectsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [selectedClassId, setSelectedClassId] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [subjectToDelete, setSubjectToDelete] = useState(null);

  const user = useSelector(selectCurrentUser);
  const tenant = useSelector(selectTenantContext);
  const isBranchAdmin = user?.role === 'BRANCH_ADMIN';

  const { data: response, isLoading } = useGetSubjectsQuery({ limit: 500 });
  const { data: branchesResponse } = useGetBranchesQuery();
  const { data: classesResponse } = useGetClassesQuery({ limit: 100 });
  const { data: sectionsResponse } = useGetSectionsQuery({ limit: 100 });
  const { data: teachersResponse } = useGetUsersQuery({ role: 'TEACHER', limit: 100 });

  const [createSubject, { isLoading: isCreating }] = useCreateSubjectMutation();
  const [updateSubject, { isLoading: isUpdating }] = useUpdateSubjectMutation();
  const [deleteSubject, { isLoading: isDeleting }] = useDeleteSubjectMutation();

  const subjects  = response?.data || [];
  const branches  = branchesResponse?.data || [];
  const branchOptions = branches.map(b => ({ value: b._id, label: b.name }));
  const classes   = classesResponse?.data || [];
  const classOptions = classes.map(c => ({ value: c._id, label: c.name }));
  const sections  = sectionsResponse?.data || [];
  const teachers  = teachersResponse?.data?.docs || teachersResponse?.data || [];
  const teacherOptions = [
    { value: '', label: 'Unassigned' },
    ...teachers.map(t => ({ value: t._id, label: t.name }))
  ];

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm({
    resolver: zodResolver(subjectSchema),
  });
  const watchClassId = watch('classId');
  const filteredSections = watchClassId
    ? sections.filter(s => (s.classId?._id || s.classId) === watchClassId)
    : sections;
  const sectionOptions = [
    { value: '', label: 'No Section' },
    ...filteredSections.map(s => ({ value: s._id, label: s.name }))
  ];

  // ── Group subjects by classId ──────────────────────────────────────────────
  const subjectsByClass = useMemo(() => {
    const map = {};
    subjects.forEach(sub => {
      const cid = sub.classId?._id || sub.classId || '__none__';
      if (!map[cid]) map[cid] = [];
      map[cid].push(sub);
    });
    return map;
  }, [subjects]);

  // ── Tabs ──────────────────────────────────────────────────────────────────
  const classTabs = useMemo(() => {
    const tabs = [{ _id: 'ALL', name: 'All Classes', code: '', count: subjects.length }];
    classes.forEach(cls => {
      tabs.push({ _id: cls._id, name: cls.name, code: cls.code, count: (subjectsByClass[cls._id] || []).length });
    });
    return tabs;
  }, [classes, subjectsByClass, subjects]);

  // ── Visible subjects ──────────────────────────────────────────────────────
  const visibleSubjects = useMemo(() => {
    let list = selectedClassId === 'ALL' ? subjects : (subjectsByClass[selectedClassId] || []);
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        (s.teacherId?.name || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [subjects, selectedClassId, subjectsByClass, searchTerm]);

  // When showing ALL, group by class for rendering
  const groupedForAll = useMemo(() => {
    if (selectedClassId !== 'ALL') return null;
    const grouped = {};
    visibleSubjects.forEach(sub => {
      const cls = sub.classId?.name || 'Unassigned Class';
      if (!grouped[cls]) grouped[cls] = [];
      grouped[cls].push(sub);
    });
    return grouped;
  }, [selectedClassId, visibleSubjects]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleOpenCreate = () => {
    setEditingSubject(null);
    const defaultBranchId = isBranchAdmin ? (tenant?.branchId?.toString() || '') : '';
    reset({ name: '', code: '', branchId: defaultBranchId, classId: selectedClassId !== 'ALL' ? selectedClassId : '', sectionId: '', teacherId: '', status: 'ACTIVE' });
    setModalOpen(true);
  };
  const handleOpenEdit = (sub) => {
    setEditingSubject(sub);
    reset({
      name: sub.name, code: sub.code,
      branchId: sub.branchId?._id || sub.branchId || '',
      classId: sub.classId?._id || sub.classId || '',
      sectionId: sub.sectionId?._id || sub.sectionId || '',
      teacherId: sub.teacherId?._id || sub.teacherId || '',
      status: sub.status,
    });
    setModalOpen(true);
  };
  const onSubmit = async (data) => {
    try {
      const payload = { ...data, code: data.code.toUpperCase(), classId: data.classId || null, sectionId: data.sectionId || null, teacherId: data.teacherId || null };
      if (editingSubject) {
        await updateSubject({ id: editingSubject._id, ...payload }).unwrap();
        toast.success('Subject updated!');
      } else {
        await createSubject(payload).unwrap();
        toast.success('Subject created!');
      }
      setModalOpen(false);
    } catch (err) {
      toast.error(err?.data?.message || 'Action failed');
    }
  };
  const handleDelete = (id) => { setSubjectToDelete(id); setDeleteConfirmOpen(true); };
  const confirmDelete = async () => {
    try {
      await deleteSubject(subjectToDelete).unwrap();
      toast.success('Subject deleted!');
      setDeleteConfirmOpen(false); setSubjectToDelete(null);
    } catch (err) { toast.error(err?.data?.message || 'Delete failed'); }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-xl w-48" />
        <div className="flex gap-3">{[1,2,3].map(i=><div key={i} className="h-10 w-28 bg-slate-200 dark:bg-slate-800 rounded-xl"/>)}</div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-black/5 dark:border-white/5 overflow-hidden">
          {[1,2,3,4,5].map(i=><div key={i} className="h-16 border-b border-slate-100 dark:border-slate-800 bg-[var(--color-primary-pink)]/5 dark:bg-slate-900/50"/>)}
        </div>
      </div>
    );
  }

  const activeClass = classes.find(c => c._id === selectedClassId);

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
        <div>
          <h2 className="text-xl font-bold text-[var(--color-text-[var(--color-primary-pink)])]">Academic Subjects</h2>
          <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">{subjects.length} subjects · {classes.length} classes</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search subject or teacher..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 glass-card rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 w-56"
            />
          </div>
          <Button onClick={handleOpenCreate} className="gap-2 shrink-0">
            <Plus className="w-4 h-4" /><span>New Subject</span>
          </Button>
        </div>
      </div>

      {/* ── Class Tabs ── */}
      <div className="flex flex-wrap gap-2 pb-1">
        {classTabs.map(tab => (
          <button
            key={tab._id}
            onClick={() => { setSelectedClassId(tab._id); setSearchTerm(''); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all border ${
              selectedClassId === tab._id
                ? 'bg-primary text-white border-primary shadow-lg shadow-primary/25'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-black/5 dark:border-white/5 hover:border-primary/40 hover:text-[var(--color-primary-pink)]'
            }`}
          >
            {tab._id === 'ALL' ? <LayersIcon className="w-3.5 h-3.5"/> : <GraduationCap className="w-3.5 h-3.5"/>}
            <span>{tab.name}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
              selectedClassId === tab._id ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-[var(--color-text-secondary)]'
            }`}>{tab.count}</span>
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      {selectedClassId !== 'ALL' ? (
        /* ── Single Class View ── */
        <ClassSubjectRoster
          subjects={visibleSubjects}
          className={activeClass?.name || ''}
          classCode={activeClass?.code || ''}
          onEdit={handleOpenEdit}
          onDelete={handleDelete}
        />
      ) : (
        /* ── All Classes View — grouped ── */
        groupedForAll && Object.keys(groupedForAll).length > 0 ? (
          <div className="space-y-6">
            {Object.entries(groupedForAll).map(([className, subs]) => (
              <ClassSubjectRoster
                key={className}
                subjects={subs}
                className={className}
                classCode=""
                onEdit={handleOpenEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        ) : (
          <EmptyState onAdd={handleOpenCreate} />
        )
      )}

      {/* ── Create / Edit Modal ── */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingSubject ? 'Edit Subject' : 'Create New Subject'} size="md">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input id="name" label="Subject Name" placeholder="e.g. Mathematics" required error={errors.name} {...register('name')} />
            <Input id="code" label="Subject Code" placeholder="e.g. MATH101" required error={errors.code} {...register('code')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            {!isBranchAdmin && (
              <Select id="branchId" label="Branch" required options={branchOptions} placeholder="Select Branch" error={errors.branchId} {...register('branchId')} />
            )}
            {isBranchAdmin && (
              <input type="hidden" {...register('branchId')} />
            )}
            <div className={isBranchAdmin ? "col-span-2" : ""}>
              <Select id="status" label="Status" required options={[{ value: 'ACTIVE', label: 'Active' }, { value: 'INACTIVE', label: 'Inactive' }]} error={errors.status} {...register('status')} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select id="classId" label="Class" options={[{ value: '', label: 'No Class' }, ...classOptions]} error={errors.classId} {...register('classId')} />
            <Select id="sectionId" label="Section" options={sectionOptions} disabled={!watchClassId} error={errors.sectionId} {...register('sectionId')} />
          </div>
          <Select id="teacherId" label="Assigned Teacher" options={teacherOptions} error={errors.teacherId} {...register('teacherId')} />
          <div className="flex justify-end gap-2 pt-4 border-t border-black/5 dark:border-white/5">
            <Button onClick={() => setModalOpen(false)} variant="outline">Cancel</Button>
            <Button type="submit" isLoading={isCreating || isUpdating}>Save Subject</Button>
          </div>
        </form>
      </Modal>

      {/* ── Delete Confirm ── */}
      <Modal isOpen={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} title="Delete Subject" size="sm">
        <div className="space-y-4">
          <p className="text-slate-600 dark:text-slate-400">Are you sure you want to delete this subject? This cannot be undone.</p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
            <Button variant="danger" onClick={confirmDelete} isLoading={isDeleting}>Delete</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ─── Class Subject Roster ─────────────────────────────────────────────────────
function ClassSubjectRoster({ subjects, className, classCode, onEdit, onDelete }) {
  if (subjects.length === 0) return <EmptyState />;

  return (
    <div className="glass-card rounded-2xl overflow-hidden shadow-sm">
      {/* Roster Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800/60 dark:to-slate-900 border-b border-black/5 dark:border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[var(--color-primary-pink)]/10 flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-[var(--color-primary-pink)]" />
          </div>
          <div>
            <h3 className="font-bold text-[var(--color-text-[var(--color-primary-pink)])] text-base leading-tight">{className}</h3>
            {classCode && <p className="text-xs text-slate-400 font-mono mt-0.5">{classCode}</p>}
          </div>
        </div>
        <span className="text-xs font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
          {subjects.length} Subject{subjects.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Column Headers */}
      <div className="grid grid-cols-12 px-6 py-2.5 bg-[var(--color-primary-pink)]/5/80 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800">
        <div className="col-span-1 text-xs font-bold text-slate-400 uppercase tracking-wider">#</div>
        <div className="col-span-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Subject</div>
        <div className="col-span-2 text-xs font-bold text-slate-400 uppercase tracking-wider">Code</div>
        <div className="col-span-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Teacher</div>
        <div className="col-span-1 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</div>
        <div className="col-span-1 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Actions</div>
      </div>

      {/* Subject Rows */}
      <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
        {subjects.map((sub, idx) => (
          <SubjectRow
            key={sub._id}
            subject={sub}
            index={idx + 1}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>

      {/* Footer total */}
      <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-[var(--color-primary-pink)]/5/50 dark:bg-slate-800/20 flex items-center justify-between">
        <p className="text-xs text-slate-400">
          {subjects.filter(s => s.teacherId?.name).length} of {subjects.length} subjects have assigned teachers
        </p>
        {subjects.filter(s => !s.teacherId?.name).length > 0 && (
          <span className="text-xs font-semibold text-amber-500">
            ⚠ {subjects.filter(s => !s.teacherId?.name).length} unassigned
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Subject Row ──────────────────────────────────────────────────────────────
function SubjectRow({ subject, index, onEdit, onDelete }) {
  const isActive = subject.status === 'ACTIVE';
  const color = getColor(subject.name);
  const icon = getIcon(subject.name);
  const teacherName = subject.teacherId?.name;
  const teacherInitial = teacherName ? teacherName.charAt(0).toUpperCase() : '?';
  const teacherColor = teacherName ? getColor(teacherName) : 'bg-slate-100 text-slate-400';

  return (
    <div className="group grid grid-cols-12 items-center px-6 py-3.5 hover:bg-[var(--color-primary-pink)]/5/80 dark:hover:bg-slate-800/30 transition-colors">
      {/* # */}
      <div className="col-span-1">
        <span className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 text-xs font-bold flex items-center justify-center">
          {index}
        </span>
      </div>

      {/* Subject Name */}
      <div className="col-span-4 flex items-center gap-2.5">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0 ${color}`}>
          {icon}
        </div>
        <div>
          <p className="font-semibold text-[var(--color-text-[var(--color-primary-pink)])] text-sm leading-tight">{subject.name}</p>
          {subject.sectionId?.name && (
            <p className="text-xs text-slate-400 flex items-center gap-0.5 mt-0.5">
              <ChevronRight className="w-3 h-3" />Section {subject.sectionId.name}
            </p>
          )}
        </div>
      </div>

      {/* Code */}
      <div className="col-span-2">
        <span className="text-xs font-mono font-bold text-[var(--color-text-secondary)] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md tracking-wider">
          {subject.code}
        </span>
      </div>

      {/* Teacher */}
      <div className="col-span-3">
        {teacherName ? (
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${teacherColor}`}>
              {teacherInitial}
            </div>
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{teacherName}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <div className="w-7 h-7 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <User className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <span className="text-xs font-semibold text-amber-500">Unassigned</span>
          </div>
        )}
      </div>

      {/* Status */}
      <div className="col-span-1">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${
          isActive
            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
            : 'bg-slate-100 text-[var(--color-text-secondary)] dark:bg-slate-800'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
          {isActive ? 'Active' : 'Off'}
        </span>
      </div>

      {/* Actions */}
      <div className="col-span-1 flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onEdit(subject)}
          className="p-1.5 rounded-lg hover:bg-[var(--color-primary-pink)]/10 hover:text-[var(--color-primary-pink)] text-slate-400 transition-colors"
          title="Edit"
        >
          <Edit2 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onDelete(subject._id)}
          className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 text-slate-400 transition-colors"
          title="Delete"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState({ onAdd }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-black/5 dark:border-white/5 rounded-2xl">
      <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
        <BookOpen className="w-8 h-8 text-slate-400" />
      </div>
      <p className="font-bold text-slate-600 dark:text-slate-400">No subjects found</p>
      <p className="text-sm text-slate-400 mt-1">This class has no subjects assigned yet.</p>
      {onAdd && (
        <Button onClick={onAdd} className="mt-5 gap-2" variant="outline">
          <Plus className="w-4 h-4" /> Add First Subject
        </Button>
      )}
    </div>
  );
}
