import React, { useState } from 'react';
import {
  useGetSessionsQuery,
  useCreateSessionMutation,
  useUpdateSessionMutation,
  useDeleteSessionMutation,
  useUpdateSessionStatusMutation
} from '../../app/api/coreApiSlice';
import Button from '../../components/common/Button';
import Table from '../../components/common/Table';
import Input from '../../components/common/Input';
import Modal from '../../components/common/Modal';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'react-hot-toast';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import dayjs from 'dayjs';
import ConfirmModal from '../../components/common/ConfirmModal';

const sessionSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  code: z.string()
    .min(1, 'Session code is required')
    .regex(/^[a-zA-Z0-9-_]+$/, 'Code must be alphanumeric (hyphens/underscores allowed)'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  isCurrent: z.boolean().optional(),
});

export default function SessionsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState(null);

  const { data: response, isLoading, refetch } = useGetSessionsQuery();
  const [createSession, { isLoading: isCreating }] = useCreateSessionMutation();
  const [updateSession, { isLoading: isUpdating }] = useUpdateSessionMutation();
  const [deleteSession, { isLoading: isDeleting }] = useDeleteSessionMutation();
  const [updateSessionStatus, { isLoading: isUpdatingStatus }] = useUpdateSessionStatusMutation();

  const sessions = response?.data || [];

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(sessionSchema),
  });

  const handleOpenCreate = () => {
    setEditingSession(null);
    reset({ name: '', code: '', startDate: '', endDate: '', isCurrent: false });
    setModalOpen(true);
  };

  const handleOpenEdit = (sess) => {
    setEditingSession(sess);
    reset({
      name: sess.name,
      code: sess.code || '',
      startDate: dayjs(sess.startDate).format('YYYY-MM-DD'),
      endDate: dayjs(sess.endDate).format('YYYY-MM-DD'),
      isCurrent: sess.isCurrent,
    });
    setModalOpen(true);
  };

  const handleToggleCurrent = async (session) => {
    const nextStatus = session.isCurrent ? 'UPCOMING' : 'ACTIVE';
    try {
      await updateSessionStatus({ id: session._id, status: nextStatus }).unwrap();
      toast.success(`Session status updated to ${nextStatus}!`);
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to update session status');
    }
  };

  const onSubmit = async (data) => {
    try {
      if (editingSession) {
        await updateSession({ id: editingSession._id, ...data }).unwrap();
        toast.success('Academic session updated!');
      } else {
        await createSession(data).unwrap();
        toast.success('Academic session created!');
      }
      setModalOpen(false);
      refetch();
    } catch (err) {
      if (err?.data?.errors && Array.isArray(err.data.errors)) {
        err.data.errors.forEach((e) => {
          toast.error(`${e.field || e.param || 'Error'}: ${e.msg || e.message}`);
        });
      } else {
        toast.error(err?.data?.message || 'Action failed');
      }
    }
  };

  const handleOpenDelete = (session) => {
    setSessionToDelete(session);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!sessionToDelete) return;
    try {
      await deleteSession(sessionToDelete._id).unwrap();
      toast.success('Academic session deleted!');
      setDeleteModalOpen(false);
      setSessionToDelete(null);
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || 'Delete failed');
    }
  };

  const columns = [
    { header: 'Session Name', accessorKey: 'name' },
    { header: 'Session Code', accessorKey: 'code', cell: ({ getValue }) => <span className="font-mono font-bold tracking-wider">{getValue()}</span> },
    { header: 'Start Date', accessorKey: 'startDate', cell: ({ getValue }) => dayjs(getValue()).format('MMM DD, YYYY') },
    { header: 'End Date', accessorKey: 'endDate', cell: ({ getValue }) => dayjs(getValue()).format('MMM DD, YYYY') },
    {
      header: 'Is Current',
      accessorKey: 'isCurrent',
      cell: ({ row }) => {
        const session = row.original;
        const isCurrent = session.isCurrent;
        return (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleToggleCurrent(session)}
              disabled={isUpdatingStatus}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 transition-all duration-200 ease-in-out focus:outline-hidden focus:ring-2 focus:ring-primary/20 ${
                isCurrent
                  ? 'bg-primary border-transparent shadow-[0_0_8px_rgba(139,92,246,0.35)]'
                  : 'bg-slate-200 dark:bg-slate-800 border-slate-300 dark:border-slate-700'
              } ${isUpdatingStatus ? 'opacity-50 cursor-not-allowed' : ''}`}
              title={isCurrent ? 'Remove current status' : 'Set as current session'}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition duration-200 ease-in-out ${
                  isCurrent ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold select-none transition-all duration-200 ${
                isCurrent
                  ? 'bg-emerald-500/10 text-[var(--color-status-success)] dark:text-emerald-450 border border-emerald-500/20'
                  : 'bg-slate-100 text-[var(--color-text-secondary)] dark:bg-slate-800/40 dark:text-slate-400 border border-black/5/60 dark:border-slate-800'
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${isCurrent ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
              {isCurrent ? 'Active' : 'Inactive'}
            </span>
          </div>
        );
      },
    },
    {
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button onClick={() => handleOpenEdit(row.original)} variant="secondary" size="sm">
            <Edit2 className="w-3.5 h-3.5" />
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
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 items-start">
        <h2 className="text-xl font-bold text-[var(--color-text-[var(--color-primary-pink)])]">Academic Sessions</h2>
        <Button onClick={handleOpenCreate} className="gap-2">
          <Plus className="w-4 h-4" />
          <span>New Session</span>
        </Button>
      </div>

      <Table columns={columns} data={sessions} isLoading={isLoading} />

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingSession ? 'Edit Academic Session' : 'Create Academic Session'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input id="name" label="Session Name" placeholder="e.g. 2026-2027" required error={errors.name} {...register('name')} />
            <Input id="code" label="Session Code" placeholder="e.g. 2026-2027" required error={errors.code} {...register('code')} />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input id="startDate" label="Start Date" type="date" required error={errors.startDate} {...register('startDate')} />
            <Input id="endDate" label="End Date" type="date" required error={errors.endDate} {...register('endDate')} />
          </div>
          
          <div className="flex items-center gap-2 mt-2">
            <input
              type="checkbox"
              id="isCurrent"
              className="rounded bg-slate-100 dark:bg-slate-900 border-slate-300 text-[var(--color-primary-pink)]"
              {...register('isCurrent')}
            />
            <label htmlFor="isCurrent" className="text-sm font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
              Set as current academic session
            </label>
          </div>
          
          <div className="flex justify-end gap-2 pt-4 border-t border-black/5 dark:border-white/5">
            <Button onClick={() => setModalOpen(false)} variant="outline">Cancel</Button>
            <Button type="submit" isLoading={isCreating || isUpdating}>Save Session</Button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Academic Session"
        message={
          <div>
            <h4 className="font-bold text-red-800 dark:text-red-300 mb-1">Are you sure you want to delete this session?</h4>
            <p className="text-red-700/80 dark:text-red-400/80">
              You are about to delete <strong className="text-red-900 dark:text-red-200">{sessionToDelete?.name}</strong>. All associated data will be affected. This action is irreversible.
            </p>
          </div>
        }
        confirmText="Delete Session"
        isLoading={isDeleting}
      />
    </div>
  );
}
