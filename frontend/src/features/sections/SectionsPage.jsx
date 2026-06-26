import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { selectCurrentUser, selectTenantContext } from '../../app/authSlice';
import {
  useGetSectionsQuery,
  useCreateSectionMutation,
  useUpdateSectionMutation,
  useDeleteSectionMutation,
  useGetClassesQuery,
  useGetBranchesQuery,
  useGetUsersQuery,
  useGetSubjectsQuery
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
import { Plus, Edit2, Trash2, Eye, User, BookOpen } from 'lucide-react';
import ConfirmModal from '../../components/common/ConfirmModal';

const sectionSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  classId: z.string().min(1, 'Class is required'),
  branchId: z.string().min(1, 'Branch is required'),
  status: z.enum(['ACTIVE', 'INACTIVE']),
});

export default function SectionsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSection, setEditingSection] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [sectionToDelete, setSectionToDelete] = useState(null);
  const [viewingSection, setViewingSection] = useState(null);

  const user = useSelector(selectCurrentUser);
  const tenant = useSelector(selectTenantContext);
  const isBranchAdmin = user?.role === 'BRANCH_ADMIN';

  const { data: response, isLoading } = useGetSectionsQuery();
  const { data: classesResponse } = useGetClassesQuery();
  const { data: branchesResponse } = useGetBranchesQuery();
  const [createSection, { isLoading: isCreating }] = useCreateSectionMutation();
  const [updateSection, { isLoading: isUpdating }] = useUpdateSectionMutation();
  const [deleteSection, { isLoading: isDeleting }] = useDeleteSectionMutation();

  const sections = response?.data || [];
  const classes = classesResponse?.data || [];
  const classOptions = classes.map(c => ({ value: c._id, label: c.name }));
  const branches = branchesResponse?.data || [];
  const branchOptions = branches.map(b => ({ value: b._id, label: b.name }));

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(sectionSchema),
  });

  const handleOpenCreate = () => {
    setEditingSection(null);
    const defaultBranchId = isBranchAdmin ? (tenant?.branchId?.toString() || '') : '';
    reset({ name: '', classId: '', branchId: defaultBranchId, status: 'ACTIVE' });
    setModalOpen(true);
  };

  const handleOpenEdit = (sec) => {
    setEditingSection(sec);
    reset({
      name: sec.name,
      classId: sec.classId?._id || sec.classId || '',
      branchId: sec.branchId?._id || sec.branchId || '',
      status: sec.status,
    });
    setModalOpen(true);
  };

  const onSubmit = async (data) => {
    try {
      const payload = { ...data, name: data.name.toUpperCase() };
      if (editingSection) {
        await updateSection({ id: editingSection._id, ...payload }).unwrap();
        toast.success('Section updated!');
      } else {
        await createSection(payload).unwrap();
        toast.success('Section created!');
      }
      setModalOpen(false);
    } catch (err) {
      toast.error(err?.data?.message || 'Action failed');
    }
  };

  const handleOpenDelete = (section) => {
    setSectionToDelete(section);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!sectionToDelete) return;
    try {
      await deleteSection(sectionToDelete._id).unwrap();
      toast.success('Section deleted!');
      setDeleteModalOpen(false);
      setSectionToDelete(null);
    } catch (err) {
      toast.error(err?.data?.message || 'Delete failed');
    }
  };

  const columns = [
    { header: 'Section Name', accessorKey: 'name' },
    { header: 'Branch', accessorKey: 'branchId.name', cell: ({ row }) => row.original.branchId?.name || 'N/A' },
    { header: 'Associated Class', accessorKey: 'classId.name', cell: ({ row }) => row.original.classId?.name || 'N/A' },
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
          <Button onClick={() => setViewingSection(row.original)} variant="primary" size="sm" title="View Details">
            <Eye className="w-3.5 h-3.5" />
          </Button>
          <Button onClick={() => handleOpenEdit(row.original)} variant="secondary" size="sm" title="Edit Section">
            <Edit2 className="w-3.5 h-3.5" />
          </Button>
          <Button onClick={() => handleOpenDelete(row.original)} variant="danger" size="sm" title="Delete Section">
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 items-start">
        <h2 className="text-xl font-bold text-[var(--color-text-[var(--color-primary-pink)])]">Academic Sections</h2>
        <Button onClick={handleOpenCreate} className="gap-2">
          <Plus className="w-4 h-4" />
          <span>New Section</span>
        </Button>
      </div>

      <Table columns={columns} data={sections} isLoading={isLoading} />

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingSection ? 'Edit Section' : 'Create Section'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input id="name" label="Section Name (e.g. A)" placeholder="A" required error={errors.name} {...register('name')} />
            <Select
              id="classId"
              label="Class"
              required
              options={classOptions}
              placeholder="Select Class"
              error={errors.classId}
              {...register('classId')}
            />
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
            {isBranchAdmin && (
              <input type="hidden" {...register('branchId')} />
            )}
            <div className={isBranchAdmin ? "col-span-2" : ""}>
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
            </div>
          </div>
          
          <div className="flex justify-end gap-2 pt-4 border-t border-black/5 dark:border-white/5">
            <Button onClick={() => setModalOpen(false)} variant="outline">Cancel</Button>
            <Button type="submit" isLoading={isCreating || isUpdating}>Save Section</Button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Academic Section"
        message={
          <div>
            <h4 className="font-bold text-red-800 dark:text-red-300 mb-1">Are you sure you want to delete this section?</h4>
            <p className="text-red-700/80 dark:text-red-400/80">
              You are about to delete section <strong className="text-red-900 dark:text-red-200">{sectionToDelete?.name}</strong> from class <strong className="text-red-900 dark:text-red-200">{sectionToDelete?.classId?.name}</strong>. All associated schedules, students, and course registries will be affected. This action is irreversible.
            </p>
          </div>
        }
        confirmText="Delete Section"
        isLoading={isDeleting}
      />

      {viewingSection && (
        <SectionDetailsModal
          isOpen={!!viewingSection}
          onClose={() => setViewingSection(null)}
          section={viewingSection}
        />
      )}
    </div>
  );
}

function SectionDetailsModal({ isOpen, onClose, section }) {
  const [activeTab, setActiveTab] = useState('students');
  const { data: studentsRes, isLoading: isLoadingStudents } = useGetUsersQuery({ sectionId: section._id, role: 'STUDENT', limit: 100 }, { skip: !isOpen });
  const { data: subjectsRes, isLoading: isLoadingSubjects } = useGetSubjectsQuery({ sectionId: section._id, limit: 100 }, { skip: !isOpen });

  const students = studentsRes?.data?.docs || studentsRes?.data || [];
  const subjects = subjectsRes?.data || [];

  const uniqueTeachers = [];
  const teacherIds = new Set();
  subjects.forEach(s => {
    if (s.teacherId && !teacherIds.has(s.teacherId._id)) {
      teacherIds.add(s.teacherId._id);

      const className = s.classId?.name || section.classId?.name || '';
      const sectionName = s.sectionId?.name || section.name || '';
      const secFormatted = sectionName ? `(Sec ${sectionName})` : '';
      const label = className ? `Class ${className} ${secFormatted} - ${s.name}` : s.name;

      uniqueTeachers.push({
        _id: s.teacherId._id,
        name: s.teacherId.name,
        email: s.teacherId.email,
        subject: label.replace(/\s+/g, ' ').trim()
      });
    }
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Section Details: ${section.classId?.name || ''} - ${section.name}`} size="lg">
      <div className="space-y-4">
        <div className="flex border-b border-black/5 dark:border-white/5">
          <button
            className={`px-4 py-2 font-semibold text-sm border-b-2 transition-colors ${activeTab === 'students' ? 'border-primary text-[var(--color-primary-pink)]' : 'border-transparent text-[var(--color-text-secondary)] hover:text-slate-700 dark:hover:text-slate-300'}`}
            onClick={() => setActiveTab('students')}
          >
            <User className="w-4 h-4 inline mr-2" />
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
                <div className="p-4 text-center text-sm text-[var(--color-text-secondary)]">Loading students...</div>
              ) : students.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {students.map(s => (
                    <div key={s._id} className="p-3 bg-[var(--color-primary-pink)]/5 dark:bg-slate-900 border border-black/5 dark:border-white/5 rounded-lg flex justify-between items-center">
                      <div>
                        <p className="text-sm font-bold text-[var(--color-text-[var(--color-primary-pink)])] dark:text-slate-200">{s.name}</p>
                        <p className="text-xs text-[var(--color-text-secondary)]">{s.email}</p>
                        {s.phone && <p className="text-xs text-slate-400 mt-0.5">{s.phone}</p>}
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${s.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                        {s.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-sm text-[var(--color-text-secondary)]">
                  No students enrolled in this section.
                </div>
              )}
            </div>
          )}

          {activeTab === 'teachers' && (
            <div className="space-y-2">
              {isLoadingSubjects ? (
                <div className="p-4 text-center text-sm text-[var(--color-text-secondary)]">Loading teachers...</div>
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
                <div className="p-6 text-center text-sm text-[var(--color-text-secondary)]">
                  No teachers assigned to this section yet.
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4 border-t border-black/5 dark:border-white/5">
          <Button onClick={onClose} variant="secondary">Close Window</Button>
        </div>
      </div>
    </Modal>
  );
}
