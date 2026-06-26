import React, { useState } from 'react';
import {
  useGetInstitutesQuery,
  useCreateInstituteMutation,
  useUpdateInstituteMutation,
  useSuspendInstituteMutation,
  useActivateInstituteMutation,
  useDeleteInstituteMutation,
  useGetPlansQuery
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
import { Plus, Edit2, ShieldAlert, ShieldCheck, Trash2, X, Search } from 'lucide-react';
import { uploadSingleFile } from '../../services/uploadHelper';

// Separate validation schemas for Create and Edit to match backend requirements
const createSchema = z.object({
  name: z.string().min(1, 'Institute name is required'),
  code: z.string().min(1, 'Institute code is required').regex(/^[a-zA-Z0-9]+$/, 'Code must be alphanumeric'),
  email: z.string().min(1, 'Contact email is required').email('Invalid email address'),
  phone: z.string().min(1, 'Contact phone is required'),
  planId: z.string().min(1, 'Subscription plan is required'),
  adminName: z.string().min(2, 'Owner admin name is required'),
  adminEmail: z.string().min(1, 'Owner admin email is required').email('Invalid email address'),
  adminPassword: z.string().min(6, 'Owner temporary password must be at least 6 characters'),
});

const editSchema = z.object({
  name: z.string().min(1, 'Institute name is required'),
  phone: z.string().min(1, 'Contact phone is required'),
});

export default function InstitutesPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingInstitute, setEditingInstitute] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [instituteToDelete, setInstituteToDelete] = useState(null);
  const [logoUrl, setLogoUrl] = useState('');
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [planFilter, setPlanFilter] = useState('');

  const { data: response, isLoading, refetch } = useGetInstitutesQuery({ search: searchTerm, status: statusFilter, planId: planFilter });
  const { data: plansResponse } = useGetPlansQuery();
  
  const [createInstitute, { isLoading: isCreating }] = useCreateInstituteMutation();
  const [updateInstitute, { isLoading: isUpdating }] = useUpdateInstituteMutation();
  const [suspendInstitute] = useSuspendInstituteMutation();
  const [activateInstitute] = useActivateInstituteMutation();
  const [deleteInstitute, { isLoading: isDeleting }] = useDeleteInstituteMutation();

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingLogo(true);
      const res = await uploadSingleFile(file);
      if (res.success) {
        setLogoUrl(res.data.fileUrl);
        toast.success('Logo uploaded successfully!');
      } else {
        toast.error('Logo upload failed');
      }
    } catch (err) {
      toast.error('Failed to upload logo');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const institutes = response?.data || [];
  const plans = plansResponse?.data || [];

  const handleDelete = (id) => {
    setInstituteToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!instituteToDelete) return;
    try {
      await deleteInstitute(instituteToDelete).unwrap();
      toast.success('Institute deleted successfully!');
      setDeleteConfirmOpen(false);
      setInstituteToDelete(null);
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || 'Delete failed');
    }
  };
  
  // Display plans using monthlyPrice / yearlyPrice
  const planOptions = plans.map(p => ({ 
    value: p._id, 
    label: `${p.name} ($${p.monthlyPrice}/mo)` 
  }));

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(editingInstitute ? editSchema : createSchema),
  });

  const handleOpenCreate = () => {
    setEditingInstitute(null);
    setLogoUrl('');
    reset({ 
      name: '', 
      code: '', 
      email: '', 
      phone: '', 
      planId: '', 
      adminName: '', 
      adminEmail: '', 
      adminPassword: 'Admin@1234' 
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (inst) => {
    setEditingInstitute(inst);
    setLogoUrl(inst.logo || '');
    reset({
      name: inst.name,
      phone: inst.phone || '',
    });
    setModalOpen(true);
  };

  const onSubmit = async (data) => {
    try {
      if (editingInstitute) {
        // Edit mode sends name, phone, and logo
        await updateInstitute({ id: editingInstitute._id, logo: logoUrl, ...data }).unwrap();
        toast.success('Institute updated successfully!');
      } else {
        // Create mode sends all details including owner credentials and logo
        await createInstitute({ logo: logoUrl, ...data }).unwrap();
        toast.success('Institute and Admin User created successfully!');
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

  const handleToggleStatus = async (inst) => {
    try {
      if (inst.status === 'ACTIVE') {
        await suspendInstitute(inst._id).unwrap();
        toast.success('Institute suspended successfully!');
      } else {
        await activateInstitute(inst._id).unwrap();
        toast.success('Institute activated successfully!');
      }
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || 'Status change failed');
    }
  };

  const columns = [
    {
      header: 'Logo',
      accessorKey: 'logo',
      cell: ({ getValue }) => {
        const val = getValue();
        return (
          <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 border border-black/5 dark:border-white/5 overflow-hidden flex items-center justify-center shrink-0">
            {val ? (
              <img src={val} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <span className="text-[10px] text-slate-400 font-bold uppercase">LMS</span>
            )}
          </div>
        );
      }
    },
    { header: 'Institute Name', accessorKey: 'name' },
    { header: 'Unique Code', accessorKey: 'code', cell: ({ getValue }) => <span className="font-mono font-bold tracking-wider">{getValue()}</span> },
    { header: 'Email', accessorKey: 'email' },
    { header: 'Active Plan', accessorKey: 'planId.name', cell: ({ row }) => row.original.planId?.name || 'No Plan' },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: ({ getValue }) => {
        const val = getValue();
        const colors = {
          ACTIVE: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400',
          SUSPENDED: 'bg-red-100 text-red-800 dark:bg-red-950/20 dark:text-red-400',
          INACTIVE: 'bg-slate-100 text-[var(--color-text-secondary)] dark:bg-slate-800 dark:text-slate-400',
        };
        return (
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${colors[val] || 'bg-slate-100'}`}>
            {val}
          </span>
        );
      },
    },
    {
      header: 'Actions',
      cell: ({ row }) => {
        const inst = row.original;
        const isActive = inst.status === 'ACTIVE';
        return (
          <div className="flex gap-2">
            <Button
              onClick={() => handleOpenEdit(inst)}
              variant="secondary"
              size="sm"
              title="Edit Institute"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </Button>
            <Button
              onClick={() => handleToggleStatus(inst)}
              variant={isActive ? 'danger' : 'success'}
              size="sm"
              title={isActive ? 'Suspend Institute' : 'Activate Institute'}
            >
              {isActive ? <ShieldAlert className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
            </Button>
            <Button
              onClick={() => handleDelete(inst._id)}
              variant="danger"
              size="sm"
              title="Delete Institute"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-[var(--color-text-[var(--color-primary-pink)])]">Registered Institutes</h2>
        <Button onClick={handleOpenCreate} className="gap-2">
          <Plus className="w-4 h-4" />
          <span>New Institute</span>
        </Button>
      </div>

      <div className="glass-card p-4 rounded-xl flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, code or email..."
            className="w-full pl-9 pr-4 py-2 bg-[var(--color-primary-pink)]/5 dark:bg-slate-950 border border-black/5 dark:border-white/5 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-4 min-w-[300px]">
          <select
            className="flex-1 px-3 py-2 bg-[var(--color-primary-pink)]/5 dark:bg-slate-950 border border-black/5 dark:border-white/5 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="INACTIVE">Inactive</option>
          </select>
          <select
            className="flex-1 px-3 py-2 bg-[var(--color-primary-pink)]/5 dark:bg-slate-950 border border-black/5 dark:border-white/5 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
          >
            <option value="">All Plans</option>
            {planOptions.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>
      </div>

      <Table columns={columns} data={institutes} isLoading={isLoading} />

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingInstitute ? 'Edit Institute' : 'Register Institute'} size={editingInstitute ? 'md' : 'lg'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          
          <div className="border-b border-black/5 dark:border-white/5 pb-2">
            <h4 className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">Institution Details</h4>
          </div>

          <div className="flex items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">Institute Logo</label>
              <div className="flex items-center gap-3 mt-1.5">
                <div className="relative w-16 h-16 rounded-xl bg-[var(--color-primary-pink)]/5 dark:bg-slate-950 border border-black/5 dark:border-white/5 flex items-center justify-center overflow-hidden shrink-0">
                  {logoUrl ? (
                    <>
                      <img src={logoUrl} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setLogoUrl('')}
                        className="absolute top-1 right-1 p-0.5 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-md transition-colors"
                        title="Remove Logo"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </>
                  ) : (
                    <span className="text-xs text-slate-400 font-bold uppercase">No Logo</span>
                  )}
                </div>
                <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 select-none transition-colors">
                  {isUploadingLogo ? 'Uploading...' : 'Upload Logo'}
                  <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" disabled={isUploadingLogo} />
                </label>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input id="name" label="Institute Name" required error={errors.name} {...register('name')} />
            {!editingInstitute && (
              <Input id="code" label="Unique Alphanumeric Code" placeholder="e.g. GREENWOOD" required error={errors.code} {...register('code')} />
            )}
          </div>

          {!editingInstitute && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input id="email" label="Contact Email" type="email" required error={errors.email} {...register('email')} />
              <Input id="phone" label="Contact Phone" required error={errors.phone} {...register('phone')} />
            </div>
          )}

          {editingInstitute && (
            <Input id="phone" label="Contact Phone" required error={errors.phone} {...register('phone')} />
          )}

          {!editingInstitute && (
            <Select
              id="planId"
              label="Select Subscription Plan"
              required
              options={planOptions}
              error={errors.planId}
              placeholder="Choose a Plan"
              {...register('planId')}
            />
          )}

          {/* Render Admin Account Details ONLY during creation */}
          {!editingInstitute && (
            <div className="space-y-4 pt-4 border-t border-black/5 dark:border-white/5">
              <div className="border-b border-black/5 dark:border-white/5 pb-2">
                <h4 className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">Default Administrator Profile</h4>
              </div>
              <Input id="adminName" label="Admin Owner Name" required error={errors.adminName} {...register('adminName')} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input id="adminEmail" label="Admin Email Address" type="email" required error={errors.adminEmail} {...register('adminEmail')} />
                <Input id="adminPassword" label="Admin Temporary Password" placeholder="••••••••" required error={errors.adminPassword} {...register('adminPassword')} />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t border-black/5 dark:border-white/5">
            <Button onClick={() => setModalOpen(false)} variant="outline">Cancel</Button>
            <Button type="submit" isLoading={isCreating || isUpdating}>Save Institute</Button>
          </div>
        </form>
      </Modal>

      {/* Professional Confirmation Dialog */}
      <Modal isOpen={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} title="Confirm Permanent Deletion" size="sm">
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-950/20 text-red-800 dark:text-red-300 rounded-lg">
            <Trash2 className="w-8 h-8 shrink-0 text-[var(--color-status-error)] dark:text-red-400" />
            <div>
              <p className="text-sm font-bold">Warning: Action cannot be undone</p>
              <p className="text-xs text-red-700/80 dark:text-red-400/80 mt-0.5">
                This will soft-delete the institute from the platform and deactivate all of its users.
              </p>
            </div>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 px-1">
            Are you sure you want to permanently delete this institute?
          </p>
          <div className="flex justify-end gap-2 pt-4 border-t border-black/5 dark:border-white/5">
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
