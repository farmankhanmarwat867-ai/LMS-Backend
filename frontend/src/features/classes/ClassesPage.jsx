import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { selectCurrentUser, selectTenantContext } from '../../app/authSlice';
import {
  useGetClassesQuery,
  useCreateClassMutation,
  useUpdateClassMutation,
  useDeleteClassMutation,
  useGetSessionsQuery,
  useGetBranchesQuery,
  useGetUsersQuery,
  useGetCoursesQuery
} from '../../app/api/coreApiSlice';
import Button from '../../components/common/Button';
import Table from '../../components/common/Table';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import Modal from '../../components/common/Modal';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'react-hot-toast';
import { Plus, Edit2, Trash2, Eye, Users, BookOpen } from 'lucide-react';

const classSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  code: z.string().min(1, 'Class code is required'),
  branchId: z.string().min(1, 'Branch is required'),
  sessionId: z.string().min(1, 'Academic Session is required'),
  status: z.enum(['ACTIVE', 'INACTIVE']),
});

export default function ClassesPage() {
  const user = useSelector(selectCurrentUser);
  const tenant = useSelector(selectTenantContext);
  const isBranchAdmin = user?.role === 'BRANCH_ADMIN';
  const [modalOpen, setModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [viewingClass, setViewingClass] = useState(null);

  const { data: response, isLoading } = useGetClassesQuery();
  const { data: sessionsResponse } = useGetSessionsQuery({ limit: 100 });
  const { data: branchesResponse } = useGetBranchesQuery();
  const [createClass, { isLoading: isCreating }] = useCreateClassMutation();
  const [updateClass, { isLoading: isUpdating }] = useUpdateClassMutation();
  const [classToDelete, setClassToDelete] = useState(null);
  const [deleteClass, { isLoading: isDeleting }] = useDeleteClassMutation();

  const classes = response?.data || [];
  const sessions = sessionsResponse?.data || [];
  const sessionOptions = sessions.map(s => ({ value: s._id, label: s.name }));
  const branches = branchesResponse?.data || [];
  const branchOptions = branches.map(b => ({ value: b._id, label: b.name }));

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(classSchema),
  });

  const handleOpenCreate = () => {
    setEditingClass(null);
    // Use tenant.branchId — always a plain string from Redux, never a populated object
    const defaultBranchId = isBranchAdmin ? (tenant?.branchId?.toString() || '') : '';
    reset({ name: '', code: '', branchId: defaultBranchId, sessionId: '', status: 'ACTIVE' });
    setModalOpen(true);
  };

  const handleOpenEdit = (cls) => {
    setEditingClass(cls);
    reset({
      name: cls.name,
      code: cls.code,
      branchId: cls.branchId?._id || cls.branchId || '',
      sessionId: cls.sessionId?._id || cls.sessionId || '',
      status: cls.status,
    });
    setModalOpen(true);
  };

  const onSubmit = async (data) => {
    try {
      if (editingClass) {
        await updateClass({ id: editingClass._id, ...data }).unwrap();
        toast.success('Class details updated!');
      } else {
        await createClass(data).unwrap();
        toast.success('Class created successfully!');
      }
      setModalOpen(false);
    } catch (err) {
      toast.error(err?.data?.message || 'Action failed');
    }
  };

  const handleDelete = (id) => {
    setClassToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!classToDelete) return;
    try {
      await deleteClass(classToDelete).unwrap();
      toast.success('Class deleted!');
      setDeleteConfirmOpen(false);
      setClassToDelete(null);
    } catch (err) {
      toast.error(err?.data?.message || 'Delete failed');
    }
  };

  const columns = [
    { header: 'Class Name', accessorKey: 'name' },
    { header: 'Class Code', accessorKey: 'code' },
    { header: 'Branch', accessorKey: 'branchId.name', cell: ({ row }) => row.original.branchId?.name || 'N/A' },
    { header: 'Academic Session', accessorKey: 'sessionId.name', cell: ({ row }) => row.original.sessionId?.name || 'N/A' },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: ({ getValue }) => (
        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getValue() === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-[var(--color-text-secondary)]'}`}>
          {getValue()}
        </span>
      ),
    },
    {
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button onClick={() => setViewingClass(row.original)} variant="primary" size="sm" title="View Details">
            <Eye className="w-3.5 h-3.5" />
          </Button>
          <Button onClick={() => handleOpenEdit(row.original)} variant="secondary" size="sm" title="Edit Class">
            <Edit2 className="w-3.5 h-3.5" />
          </Button>
          <Button onClick={() => handleDelete(row.original._id)} variant="danger" size="sm" title="Delete Class">
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 items-start">
        <h2 className="text-xl font-bold text-[var(--color-text-[var(--color-primary-pink)])]">Academic Classes</h2>
        <Button onClick={handleOpenCreate} className="gap-2">
          <Plus className="w-4 h-4" />
          <span>New Class</span>
        </Button>
      </div>

      <Table columns={columns} data={classes} isLoading={isLoading} />

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingClass ? 'Edit Class' : 'Create Class'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input id="name" label="Class Name (e.g. Grade 10)" required error={errors.name} {...register('name')} />
            <Input id="code" label="Class Code" placeholder="G10" required error={errors.code} {...register('code')} />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            {!isBranchAdmin && (
              <Select
                id="branchId"
                label="Branch"
                required
                options={branchOptions}
                placeholder="Select Branch"
                error={errors.branchId}
                {...register('branchId')}
              />
            )}
            {/* Hidden field to carry branchId for BRANCH_ADMIN */}
            {isBranchAdmin && (
              <input type="hidden" {...register('branchId')} />
            )}
            <div className={isBranchAdmin ? "col-span-2" : ""}>
              <Select
                id="sessionId"
                label="Academic Session"
                required
                options={sessionOptions}
                placeholder={sessionsResponse ? (sessionOptions.length === 0 ? 'No sessions available — ask Institute Admin to create one' : 'Select Session') : 'Loading sessions...'}
                error={errors.sessionId}
                {...register('sessionId')}
              />
            </div>
          </div>

          <Select
            id="status"
            label="Status"
            required
            options={[
              { value: 'ACTIVE', label: 'Active' },
              { value: 'INACTIVE', label: 'Inactive' },
            ]}
            error={errors.status}
            {...register('status')}
          />
          
          <div className="flex justify-end gap-2 pt-4 border-t border-black/5 dark:border-white/5">
            <Button onClick={() => setModalOpen(false)} variant="outline">Cancel</Button>
            <Button type="submit" isLoading={isCreating || isUpdating}>Save Class</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} title="Confirm Delete">
        <div className="space-y-4">
          <p className="text-slate-600 dark:text-slate-400">Are you sure you want to delete this class? This action cannot be undone.</p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
            <Button variant="danger" onClick={confirmDelete} disabled={isDeleting}>Delete Class</Button>
          </div>
        </div>
      </Modal>

      {viewingClass && (
        <ClassDetailsModal
          isOpen={!!viewingClass}
          onClose={() => setViewingClass(null)}
          cls={viewingClass}
        />
      )}
    </div>
  );
}

function ClassDetailsModal({ isOpen, onClose, cls }) {
  const [activeTab, setActiveTab] = useState('students');
  const { data: studentsRes, isLoading: isLoadingStudents } = useGetUsersQuery({ classId: cls._id, role: 'STUDENT', limit: 100 }, { skip: !isOpen });
  const { data: coursesRes, isLoading: isLoadingTeachers } = useGetCoursesQuery({ classId: cls._id, limit: 100 }, { skip: !isOpen });

  const students = studentsRes?.data?.docs || studentsRes?.data || [];
  const courses = coursesRes?.data?.docs || coursesRes?.data || [];
  
  const uniqueTeachers = [];
  const teacherIds = new Set();
  courses.forEach(c => {
    if (c.teacherId && !teacherIds.has(c.teacherId._id)) {
      teacherIds.add(c.teacherId._id);

      const className = c.classId?.name || cls.name || '';
      const sectionName = c.sectionId?.name ? `(Sec ${c.sectionId.name})` : '';
      const subjectName = c.subjectId?.name || c.title || 'Unknown Subject';
      const label = className ? `Class ${className} ${sectionName} - ${subjectName}` : subjectName;

      uniqueTeachers.push({
        _id: c.teacherId._id,
        name: c.teacherId.name,
        email: c.teacherId.email,
        subject: label.replace(/\s+/g, ' ').trim()
      });
    }
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Class Details: ${cls.name} (${cls.code})`} size="lg">
      <div className="space-y-4">
        <div className="flex border-b border-black/5 dark:border-white/5">
          <button
            className={`px-4 py-2 font-semibold text-sm border-b-2 transition-colors ${activeTab === 'students' ? 'border-primary text-[var(--color-primary-pink)]' : 'border-transparent text-[var(--color-text-secondary)] hover:text-slate-700 dark:hover:text-slate-300'}`}
            onClick={() => setActiveTab('students')}
          >
            <Users className="w-4 h-4 inline mr-2" />
            Students ({students.length})
          </button>
          <button
            className={`px-4 py-2 font-semibold text-sm border-b-2 transition-colors ${activeTab === 'teachers' ? 'border-primary text-[var(--color-primary-pink)]' : 'border-transparent text-[var(--color-text-secondary)] hover:text-slate-700 dark:hover:text-slate-300'}`}
            onClick={() => setActiveTab('teachers')}
          >
            <BookOpen className="w-4 h-4 inline mr-2" />
            Assigned Teachers ({uniqueTeachers.length})
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {activeTab === 'students' && (
            <div className="space-y-2">
              {isLoadingStudents ? (
                <p className="text-sm text-[var(--color-text-secondary)]">Loading students...</p>
              ) : students.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {students.map(s => (
                    <div key={s._id} className="p-3 bg-[var(--color-primary-pink)]/5 dark:bg-slate-900 border border-black/5 dark:border-white/5 rounded-lg flex justify-between items-center">
                      <div>
                        <p className="text-sm font-bold text-[var(--color-text-[var(--color-primary-pink)])] dark:text-slate-200">{s.name}</p>
                        <p className="text-xs text-[var(--color-text-secondary)]">{s.email}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${s.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                        {s.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[var(--color-text-secondary)]">No students found in this class.</p>
              )}
            </div>
          )}

          {activeTab === 'teachers' && (
            <div className="space-y-2">
              {isLoadingTeachers ? (
                <p className="text-sm text-[var(--color-text-secondary)]">Loading teachers...</p>
              ) : uniqueTeachers.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {uniqueTeachers.map(t => (
                    <div key={t._id} className="p-3 bg-[var(--color-primary-pink)]/5 dark:bg-slate-900 border border-black/5 dark:border-white/5 rounded-lg">
                      <p className="text-sm font-bold text-[var(--color-text-[var(--color-primary-pink)])] dark:text-slate-200">{t.name}</p>
                      <p className="text-xs text-[var(--color-text-secondary)] mb-1">{t.email}</p>
                      <p className="text-xs font-semibold text-[var(--color-primary-pink)]">Teaches: {t.subject}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[var(--color-text-secondary)]">No teachers assigned to this class yet.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
