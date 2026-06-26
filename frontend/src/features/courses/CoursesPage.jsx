import React, { useState } from 'react';
import {
  useGetCoursesQuery,
  useCreateCourseMutation,
  useUpdateCourseMutation,
  useDeleteCourseMutation,
  usePublishCourseMutation,
  useGetUsersQuery
} from '../../app/api/coreApiSlice';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../../app/authSlice';
import Button from '../../components/common/Button';
import Table from '../../components/common/Table';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import Modal from '../../components/common/Modal';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'react-hot-toast';
import { Plus, Edit2, Trash2, Send } from 'lucide-react';
import ConfirmModal from '../../components/common/ConfirmModal';

const courseSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  code: z.string().min(1, 'Subject code is required'),
  description: z.string().optional(),
  teacherId: z.string().min(1, 'Teacher assignment is required'),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']),
});

export default function CoursesPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState(null);
  const currentUser = useSelector(selectCurrentUser);

  const { data: response, isLoading, refetch } = useGetCoursesQuery();
  const { data: teachersResponse } = useGetUsersQuery({ role: 'TEACHER', limit: 100 });
  const [createCourse, { isLoading: isCreating }] = useCreateCourseMutation();
  const [updateCourse, { isLoading: isUpdating }] = useUpdateCourseMutation();
  const [deleteCourse, { isLoading: isDeleting }] = useDeleteCourseMutation();
  const [publishCourse] = usePublishCourseMutation();

  const courses = response?.data || [];
  const teachers = teachersResponse?.data?.docs || teachersResponse?.data || [];
  const teacherOptions = teachers.map(t => ({ value: t._id, label: t.name }));

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(courseSchema),
  });

  const handleOpenCreate = () => {
    setEditingCourse(null);
    reset({
      title: '',
      code: '',
      description: '',
      teacherId: currentUser?.role === 'TEACHER' ? currentUser.id || currentUser._id : '',
      status: 'DRAFT'
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (course) => {
    setEditingCourse(course);
    reset({
      title: course.title,
      code: course.code,
      description: course.description || '',
      teacherId: course.teacherId?._id || course.teacherId || '',
      status: course.status,
    });
    setModalOpen(true);
  };

  const onSubmit = async (data) => {
    try {
      if (editingCourse) {
        await updateCourse({ id: editingCourse._id, ...data }).unwrap();
        toast.success('Subject details updated successfully!');
      } else {
        await createCourse(data).unwrap();
        toast.success('Subject created successfully!');
      }
      setModalOpen(false);
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to save subject');
    }
  };

  const handleOpenDelete = (course) => {
    setCourseToDelete(course);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!courseToDelete) return;
    try {
      await deleteCourse(courseToDelete._id).unwrap();
      toast.success('Subject deleted!');
      setDeleteModalOpen(false);
      setCourseToDelete(null);
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || 'Delete failed');
    }
  };

  const handlePublish = async (id) => {
    try {
      await publishCourse(id).unwrap();
      toast.success('Subject published successfully!');
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || 'Publish failed');
    }
  };

  const columns = [
    { header: 'Subject Code', accessorKey: 'code' },
    { header: 'Subject Title', accessorKey: 'title', cell: ({ getValue }) => <span className="font-semibold">{getValue()}</span> },
    { header: 'Class', accessorKey: 'classId.name', cell: ({ row }) => row.original.classId?.name || 'N/A' },
    { header: 'Section', accessorKey: 'sectionId.name', cell: ({ row }) => row.original.sectionId?.name || 'N/A' },
    { header: 'Assigned Teacher', accessorKey: 'teacherId.name', cell: ({ row }) => row.original.teacherId?.name || 'Unassigned' },
    { header: 'Enrolled Students', accessorKey: 'enrolledCount', cell: ({ getValue }) => <span className="font-medium text-indigo-600 dark:text-indigo-400">{getValue() || 0}</span> },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: ({ getValue }) => {
        const val = getValue();
        const colors = {
          DRAFT: 'bg-amber-100 text-amber-800 dark:bg-amber-950/20 dark:text-amber-400',
          PUBLISHED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400',
          ARCHIVED: 'bg-slate-100 text-[var(--color-text-secondary)] dark:bg-slate-800 dark:text-slate-400',
        };
        return (
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${colors[val] || 'bg-slate-100'}`}>
            {val}
          </span>
        );
      },
    },
    ...(['BRANCH_ADMIN', 'INSTITUTE_ADMIN', 'SUPER_ADMIN'].includes(currentUser?.role) ? [{
      header: 'Actions',
      cell: ({ row }) => {
        const c = row.original;
        return (
          <div className="flex gap-2">
            <Button onClick={() => handleOpenEdit(c)} variant="secondary" size="sm">
              <Edit2 className="w-3.5 h-3.5" />
            </Button>
            <Button onClick={() => handleOpenDelete(c)} variant="danger" size="sm">
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        );
      },
    }] : []),
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 items-start">
        <h2 className="text-xl font-bold text-[var(--color-text-[var(--color-primary-pink)])]">
          {['TEACHER', 'STUDENT'].includes(currentUser?.role) ? 'My Subjects' : 'Subjects Directory'}
        </h2>
        {['BRANCH_ADMIN', 'INSTITUTE_ADMIN'].includes(currentUser?.role) && (
          <Button onClick={handleOpenCreate} className="gap-2">
            <Plus className="w-4 h-4" />
            <span>Assign Subject</span>
          </Button>
        )}
      </div>

      <Table columns={columns} data={courses} isLoading={isLoading} />

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingCourse ? 'Edit Subject Details' : 'Assign Subject'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input id="title" label="Subject Title" required error={errors.title} {...register('title')} />
          <Input id="code" label="Subject Code" placeholder="CS-101" required error={errors.code} {...register('code')} />
          <Input id="description" label="Subject Description" error={errors.description} {...register('description')} />

          <Select
            id="teacherId"
            label="Assigned Teacher"
            required
            options={teacherOptions}
            placeholder="Select Teacher"
            error={errors.teacherId}
            disabled={currentUser?.role === 'TEACHER'}
            {...register('teacherId')}
          />

          <Select
            id="status"
            label="Subject Status"
            required
            options={[
              { value: 'DRAFT', label: 'Draft' },
              { value: 'PUBLISHED', label: 'Published' },
              { value: 'ARCHIVED', label: 'Archived' },
            ]}
            error={errors.status}
            {...register('status')}
          />
          
          <div className="flex justify-end gap-2 pt-4 border-t border-black/5 dark:border-white/5">
            <Button onClick={() => setModalOpen(false)} variant="outline">Cancel</Button>
            <Button type="submit" isLoading={isCreating || isUpdating}>Save Subject</Button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Subject"
        message={
          <div>
            <h4 className="font-bold text-red-800 dark:text-red-300 mb-1">Are you sure you want to delete this subject?</h4>
            <p className="text-red-700/80 dark:text-red-400/80">
              You are about to delete the subject <strong className="text-red-900 dark:text-red-200">{courseToDelete?.title}</strong> ({courseToDelete?.code}). All student enrollments and records linked to this subject will be deleted. This action is irreversible.
            </p>
          </div>
        }
        confirmText="Delete Subject"
        isLoading={isDeleting}
      />
    </div>
  );
}
