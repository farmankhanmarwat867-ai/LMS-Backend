import React, { useState } from 'react';
import {
  useGetPlansQuery,
  useCreatePlanMutation,
  useUpdatePlanMutation,
  useDeletePlanMutation
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
import { Plus, Edit2, Trash2 } from 'lucide-react';

const planSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().min(1, 'Description is required'),
  monthlyPrice: z.coerce.number().min(0, 'Monthly price must be non-negative'),
  yearlyPrice: z.coerce.number().min(0, 'Yearly price must be non-negative'),
  studentLimit: z.coerce.number().int().min(1, 'At least 1 student limit required'),
  teacherLimit: z.coerce.number().int().min(1, 'At least 1 teacher limit required'),
  branchLimit: z.coerce.number().int().min(1, 'At least 1 branch limit required'),
  storageLimit: z.coerce.number().int().min(1, 'Storage limit must be at least 1 GB'),
  featuresString: z.string().min(1, 'At least one feature is required'),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

export default function PlansPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [planToDelete, setPlanToDelete] = useState(null);

  const { data: response, isLoading, refetch } = useGetPlansQuery();
  const [createPlan, { isLoading: isCreating }] = useCreatePlanMutation();
  const [updatePlan, { isLoading: isUpdating }] = useUpdatePlanMutation();
  const [deletePlan, { isLoading: isDeleting }] = useDeletePlanMutation();

  const plans = response?.data || [];

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(planSchema),
  });

  const handleOpenCreate = () => {
    setEditingPlan(null);
    reset({
      name: '',
      description: '',
      monthlyPrice: 19,
      yearlyPrice: 199,
      studentLimit: 100,
      teacherLimit: 10,
      branchLimit: 2,
      storageLimit: 5,
      featuresString: 'QR Attendance, Course Management',
      status: 'ACTIVE'
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (plan) => {
    setEditingPlan(plan);
    reset({
      name: plan.name,
      description: plan.description || '',
      monthlyPrice: plan.monthlyPrice,
      yearlyPrice: plan.yearlyPrice,
      studentLimit: plan.studentLimit,
      teacherLimit: plan.teacherLimit,
      branchLimit: plan.branchLimit,
      storageLimit: plan.storageLimit,
      featuresString: plan.features ? plan.features.join(', ') : '',
      status: plan.status || 'ACTIVE',
    });
    setModalOpen(true);
  };

  const onSubmit = async (data) => {
    // Process comma separated features into an array of strings
    const processedFeatures = data.featuresString
      .split(',')
      .map(f => f.trim())
      .filter(Boolean);

    const payload = {
      name: data.name,
      description: data.description,
      monthlyPrice: data.monthlyPrice,
      yearlyPrice: data.yearlyPrice,
      studentLimit: data.studentLimit,
      teacherLimit: data.teacherLimit,
      branchLimit: data.branchLimit,
      storageLimit: data.storageLimit,
      features: processedFeatures,
      status: data.status || 'ACTIVE',
    };

    try {
      if (editingPlan) {
        await updatePlan({ id: editingPlan._id, ...payload }).unwrap();
        toast.success('Subscription plan updated successfully!');
      } else {
        await createPlan(payload).unwrap();
        toast.success('Subscription plan created successfully!');
      }
      setModalOpen(false);
      refetch();
    } catch (err) {
      if (err?.data?.errors && Array.isArray(err.data.errors)) {
        err.data.errors.forEach((e) => {
          toast.error(`${e.field}: ${e.message}`);
        });
      } else {
        toast.error(err?.data?.message || 'Action failed');
      }
    }
  };

  const handleDelete = (id) => {
    setPlanToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!planToDelete) return;
    try {
      await deletePlan(planToDelete).unwrap();
      toast.success('Subscription plan deleted successfully!');
      setDeleteConfirmOpen(false);
      setPlanToDelete(null);
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || 'Delete failed');
    }
  };

  const columns = [
    { header: 'Plan Name', accessorKey: 'name', cell: ({ getValue }) => <span className="font-semibold">{getValue()}</span> },
    { header: 'Monthly ($)', accessorKey: 'monthlyPrice', cell: ({ getValue }) => `$${getValue()}` },
    { header: 'Yearly ($)', accessorKey: 'yearlyPrice', cell: ({ getValue }) => `$${getValue()}` },
    { header: 'Branch Limit', accessorKey: 'branchLimit' },
    { header: 'Student Limit', accessorKey: 'studentLimit' },
    { header: 'Storage (GB)', accessorKey: 'storageLimit' },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: ({ getValue }) => (
        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getValue() === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-[var(--color-text-secondary)]'}`}>
          {getValue() || 'ACTIVE'}
        </span>
      ),
    },
    {
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button onClick={() => handleOpenEdit(row.original)} variant="secondary" size="sm">
            <Edit2 className="w-3.5 h-3.5" />
          </Button>
          <Button onClick={() => handleDelete(row.original._id)} variant="danger" size="sm">
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 items-start">
        <h2 className="text-xl font-bold text-[var(--color-text-[var(--color-primary-pink)])]">Subscription Plans</h2>
        <Button onClick={handleOpenCreate} className="gap-2">
          <Plus className="w-4 h-4" />
          <span>New Plan</span>
        </Button>
      </div>

      <Table columns={columns} data={plans} isLoading={isLoading} />

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingPlan ? 'Edit Subscription Plan' : 'Create Subscription Plan'} size="lg">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input id="name" label="Plan Name" required error={errors.name} {...register('name')} />
          <Input id="description" label="Description" required error={errors.description} {...register('description')} />
          
          <div className="grid grid-cols-2 gap-4">
            <Input id="monthlyPrice" label="Monthly Price ($)" type="number" required error={errors.monthlyPrice} {...register('monthlyPrice')} />
            <Input id="yearlyPrice" label="Yearly Price ($)" type="number" required error={errors.yearlyPrice} {...register('yearlyPrice')} />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <Input id="branchLimit" label="Max Branches" type="number" required error={errors.branchLimit} {...register('branchLimit')} />
            <Input id="studentLimit" label="Max Students" type="number" required error={errors.studentLimit} {...register('studentLimit')} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input id="teacherLimit" label="Max Teachers" type="number" required error={errors.teacherLimit} {...register('teacherLimit')} />
            <Input id="storageLimit" label="Storage Limit (GB)" type="number" required error={errors.storageLimit} {...register('storageLimit')} />
          </div>

          <Input id="featuresString" label="Plan Features (Comma separated list)" placeholder="e.g. QR Attendance, Result Management, Course Management" required error={errors.featuresString} {...register('featuresString')} />

          <Select
            id="status"
            label="Status"
            options={[
              { value: 'ACTIVE', label: 'Active' },
              { value: 'INACTIVE', label: 'Inactive' },
            ]}
            error={errors.status}
            {...register('status')}
          />

          <div className="flex justify-end gap-2 pt-4 border-t border-black/5 dark:border-slate-850">
            <Button onClick={() => setModalOpen(false)} variant="outline">Cancel</Button>
            <Button type="submit" isLoading={isCreating || isUpdating}>Save Plan</Button>
          </div>
        </form>
      </Modal>

      {/* Professional Confirmation Dialog */}
      <Modal isOpen={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} title="Confirm Plan Deletion" size="sm">
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-950/20 text-red-800 dark:text-red-300 rounded-lg">
            <Trash2 className="w-8 h-8 shrink-0 text-[var(--color-status-error)] dark:text-red-400" />
            <div>
              <p className="text-sm font-bold">Warning: Action cannot be undone</p>
              <p className="text-xs text-red-700/80 dark:text-red-400/80 mt-0.5">
                This will soft-delete the subscription plan from the platform and release its name.
              </p>
            </div>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 px-1">
            Are you sure you want to permanently delete this subscription plan?
          </p>
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-150 dark:border-slate-800">
            <Button onClick={() => setDeleteConfirmOpen(false)} variant="outline">
              Cancel
            </Button>
            <Button onClick={confirmDelete} variant="danger" isLoading={isDeleting}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
