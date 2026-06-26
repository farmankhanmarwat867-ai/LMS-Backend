import React, { useState } from 'react';
import {
  useGetBranchesQuery,
  useCreateBranchMutation,
  useUpdateBranchMutation,
  useDeleteBranchMutation,
  useGetClassesQuery,
  useGetSectionsQuery,
  useGetSubjectsQuery,
  useGetUsersQuery,
} from '../../app/api/coreApiSlice';
import Button from '../../components/common/Button';
import Table from '../../components/common/Table';
import Input from '../../components/common/Input';
import Modal from '../../components/common/Modal';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'react-hot-toast';
import {
  Plus, Edit2, Trash2, X, Eye, ArrowLeft,
  GraduationCap, Users, BookOpen, ChevronRight,
  Building2, Mail, Phone, MapPin, Hash,
  UserCheck
} from 'lucide-react';
import { uploadSingleFile } from '../../services/uploadHelper';
import ConfirmModal from '../../components/common/ConfirmModal';

const createSchema = z.object({
  name: z.string().min(1, 'Branch name is required'),
  code: z.string().min(1, 'Branch code is required').regex(/^[a-zA-Z0-9]+$/, 'Code must be alphanumeric'),
  email: z.string().min(1, 'Contact email is required').email('Invalid email address'),
  phone: z.string().min(1, 'Phone number is required'),
  address: z.string().optional(),
  adminName: z.string().min(2, 'Admin owner name is required'),
  adminEmail: z.string().min(1, 'Admin owner email is required').email('Invalid email address'),
  adminPassword: z.string().min(6, 'Admin temporary password must be at least 6 characters'),
});

const editSchema = z.object({
  name: z.string().min(1, 'Branch name is required'),
  phone: z.string().min(1, 'Phone number is required'),
  address: z.string().optional(),
});

// ── Branch Detail Dashboard ──────────────────────────────────────────────────
function BranchDetailView({ branch, onBack }) {
  const [activeTab, setActiveTab] = useState('overview');

  const { data: classesRes, isLoading: classesLoading } = useGetClassesQuery({ branchId: branch._id, limit: 200 });
  const { data: sectionsRes, isLoading: sectionsLoading } = useGetSectionsQuery({ branchId: branch._id, limit: 200 });
  const { data: subjectsRes, isLoading: subjectsLoading } = useGetSubjectsQuery({ branchId: branch._id, limit: 200 });
  const { data: usersRes, isLoading: usersLoading } = useGetUsersQuery({ branchId: branch._id, limit: 200 });

  const classes = classesRes?.data || [];
  const sections = sectionsRes?.data || [];
  const subjects = subjectsRes?.data || [];
  const users = usersRes?.data?.docs || usersRes?.data || [];

  const teachers = users.filter(u => u.role === 'TEACHER');
  const students = users.filter(u => u.role === 'STUDENT');

  const stats = [
    { label: 'Classes', value: classes.length, icon: GraduationCap, color: 'text-violet-600', bg: 'bg-violet-100 dark:bg-violet-900/20' },
    { label: 'Sections', value: sections.length, icon: ChevronRight, color: 'text-sky-600', bg: 'bg-sky-100 dark:bg-sky-900/20' },
    { label: 'Subjects', value: subjects.length, icon: BookOpen, color: 'text-[var(--color-status-success)]', bg: 'bg-emerald-100 dark:bg-emerald-900/20' },
    { label: 'Teachers', value: teachers.length, icon: UserCheck, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/20' },
    { label: 'Students', value: students.length, icon: Users, color: 'text-rose-600', bg: 'bg-rose-100 dark:bg-rose-900/20' },
    { label: 'Total Users', value: users.length, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-100 dark:bg-indigo-900/20' },
  ];

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'classes', label: `Classes (${classes.length})` },
    { id: 'sections', label: `Sections (${sections.length})` },
    { id: 'subjects', label: `Subjects (${subjects.length})` },
    { id: 'teachers', label: `Teachers (${teachers.length})` },
    { id: 'students', label: `Students (${students.length})` },
  ];

  const classColumns = [
    { header: 'Class Name', accessorKey: 'name' },
    { header: 'Code', accessorKey: 'code', cell: ({ getValue }) => <span className="font-mono font-bold">{getValue()}</span> },
    { header: 'Session', accessorKey: 'sessionId.name', cell: ({ row }) => row.original.sessionId?.name || 'N/A' },
    {
      header: 'Status', accessorKey: 'status',
      cell: ({ getValue }) => (
        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getValue() === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-[var(--color-text-secondary)]'}`}>
          {getValue()}
        </span>
      )
    },
  ];

  const sectionColumns = [
    { header: 'Section', accessorKey: 'name' },
    { header: 'Class', accessorKey: 'classId.name', cell: ({ row }) => row.original.classId?.name || 'N/A' },
    {
      header: 'Status', accessorKey: 'status',
      cell: ({ getValue }) => (
        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getValue() === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-[var(--color-text-secondary)]'}`}>
          {getValue()}
        </span>
      )
    },
  ];

  const subjectColumns = [
    { header: 'Subject', accessorKey: 'name' },
    { header: 'Code', accessorKey: 'code', cell: ({ getValue }) => <span className="font-mono font-bold">{getValue()}</span> },
    { header: 'Class', accessorKey: 'classId.name', cell: ({ row }) => row.original.classId?.name || 'N/A' },
  ];

  const userColumns = [
    {
      header: 'Name', accessorKey: 'name',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-[var(--color-primary-pink)]/10 text-[var(--color-primary-pink)] flex items-center justify-center text-xs font-bold shrink-0">
            {(row.original.name || 'U')[0].toUpperCase()}
          </div>
          <div>
            <p className="font-medium text-[var(--color-text-[var(--color-primary-pink)])] text-sm">{row.original.name}</p>
            <p className="text-xs text-[var(--color-text-secondary)]">{row.original.email}</p>
          </div>
        </div>
      )
    },
    {
      header: 'Status', accessorKey: 'isActive',
      cell: ({ getValue }) => (
        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getValue() ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-[var(--color-status-error)]'}`}>
          {getValue() ? 'Active' : 'Inactive'}
        </span>
      )
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-primary-pink)] dark:text-slate-400 dark:hover:text-[var(--color-primary-pink)] transition-colors mt-1"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Branches</span>
        </button>
      </div>

      {/* Branch Info Card */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 dark:from-slate-800 dark:to-slate-900 rounded-2xl p-6 border border-slate-700">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center overflow-hidden shrink-0">
            {branch.logo ? (
              <img src={branch.logo} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <Building2 className="w-8 h-8 text-white/60" />
            )}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white">{branch.name}</h1>
            <div className="flex flex-wrap gap-4 mt-2">
              <span className="flex items-center gap-1.5 text-slate-300 text-sm">
                <Hash className="w-3.5 h-3.5" /> {branch.code}
              </span>
              {branch.email && (
                <span className="flex items-center gap-1.5 text-slate-300 text-sm">
                  <Mail className="w-3.5 h-3.5" /> {branch.email}
                </span>
              )}
              {branch.phone && (
                <span className="flex items-center gap-1.5 text-slate-300 text-sm">
                  <Phone className="w-3.5 h-3.5" /> {branch.phone}
                </span>
              )}
              {branch.address && (
                <span className="flex items-center gap-1.5 text-slate-300 text-sm">
                  <MapPin className="w-3.5 h-3.5" /> {branch.address}
                </span>
              )}
            </div>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-bold shrink-0 ${branch.isActive !== false ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/30'}`}>
            {branch.isActive !== false ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {stats.map(stat => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-black/5 dark:border-white/5 text-center">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2 ${stat.bg}`}>
                <Icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <p className="text-2xl font-bold text-[var(--color-text-[var(--color-primary-pink)])]">{stat.value}</p>
              <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-black/5 dark:border-white/5 overflow-hidden">
        {/* Tab Bar */}
        <div className="flex border-b border-black/5 dark:border-white/5 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-3 text-sm font-semibold whitespace-nowrap transition-colors border-b-2 -mb-px ${
                activeTab === tab.id
                  ? 'border-primary text-[var(--color-primary-pink)]'
                  : 'border-transparent text-[var(--color-text-secondary)] hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-5">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Recent Classes */}
              <div>
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-violet-500" /> Recent Classes
                </h3>
                {classesLoading ? (
                  <p className="text-sm text-slate-400">Loading...</p>
                ) : classes.length === 0 ? (
                  <p className="text-sm text-slate-400 italic">No classes created yet</p>
                ) : (
                  <div className="space-y-2">
                    {classes.slice(0, 5).map(cls => (
                      <div key={cls._id} className="flex justify-between items-center py-2 px-3 bg-white/5 rounded-lg">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{cls.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${cls.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-[var(--color-text-secondary)]'}`}>
                          {cls.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Teachers */}
              <div>
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-amber-500" /> Teaching Staff
                </h3>
                {usersLoading ? (
                  <p className="text-sm text-slate-400">Loading...</p>
                ) : teachers.length === 0 ? (
                  <p className="text-sm text-slate-400 italic">No teachers assigned yet</p>
                ) : (
                  <div className="space-y-2">
                    {teachers.slice(0, 5).map(t => (
                      <div key={t._id} className="flex items-center gap-3 py-2 px-3 bg-white/5 rounded-lg">
                        <div className="w-7 h-7 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 flex items-center justify-center text-xs font-bold shrink-0">
                          {t.name[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{t.name}</p>
                          <p className="text-xs text-slate-400 truncate">{t.email}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'classes' && (
            <Table columns={classColumns} data={classes} isLoading={classesLoading} />
          )}
          {activeTab === 'sections' && (
            <Table columns={sectionColumns} data={sections} isLoading={sectionsLoading} />
          )}
          {activeTab === 'subjects' && (
            <Table columns={subjectColumns} data={subjects} isLoading={subjectsLoading} />
          )}
          {activeTab === 'teachers' && (
            <Table columns={userColumns} data={teachers} isLoading={usersLoading} />
          )}
          {activeTab === 'students' && (
            <Table columns={userColumns} data={students} isLoading={usersLoading} />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Branches Page ────────────────────────────────────────────────────────
export default function BranchesPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [logoUrl, setLogoUrl] = useState('');
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [branchToDelete, setBranchToDelete] = useState(null);
  const [viewingBranch, setViewingBranch] = useState(null);

  const { data: response, isLoading, refetch } = useGetBranchesQuery();
  const [createBranch, { isLoading: isCreating }] = useCreateBranchMutation();
  const [updateBranch, { isLoading: isUpdating }] = useUpdateBranchMutation();
  const [deleteBranch, { isLoading: isDeleting }] = useDeleteBranchMutation();

  const branches = response?.data || [];

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(editingBranch ? editSchema : createSchema),
  });

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
    } catch {
      toast.error('Failed to upload logo');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingBranch(null);
    setLogoUrl('');
    reset({ name: '', code: '', email: '', phone: '', address: '', adminName: '', adminEmail: '', adminPassword: 'Admin@1234' });
    setModalOpen(true);
  };

  const handleOpenEdit = (branch) => {
    setEditingBranch(branch);
    setLogoUrl(branch.logo || '');
    reset({ name: branch.name, phone: branch.phone || '', address: branch.address || '' });
    setModalOpen(true);
  };

  const onSubmit = async (data) => {
    try {
      if (editingBranch) {
        await updateBranch({ id: editingBranch._id, logo: logoUrl, ...data }).unwrap();
        toast.success('Branch updated successfully!');
      } else {
        await createBranch({ logo: logoUrl, ...data }).unwrap();
        toast.success('Branch and Admin User created successfully!');
      }
      setModalOpen(false);
      refetch();
    } catch (err) {
      if (err?.data?.errors && Array.isArray(err.data.errors)) {
        err.data.errors.forEach((e) => toast.error(`${e.field || e.param || 'Error'}: ${e.msg || e.message}`));
      } else {
        toast.error(err?.data?.message || 'Action failed');
      }
    }
  };

  const handleOpenDelete = (branch) => {
    setBranchToDelete(branch);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!branchToDelete) return;
    try {
      await deleteBranch(branchToDelete._id).unwrap();
      toast.success('Branch suspended successfully!');
      setDeleteModalOpen(false);
      setBranchToDelete(null);
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || 'Delete failed');
    }
  };

  // If viewing a specific branch, render detail view
  if (viewingBranch) {
    return <BranchDetailView branch={viewingBranch} onBack={() => setViewingBranch(null)} />;
  }

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
              <span className="text-[10px] text-slate-400 font-bold uppercase">BR</span>
            )}
          </div>
        );
      }
    },
    { header: 'Branch Name', accessorKey: 'name' },
    { header: 'Branch Code', accessorKey: 'code', cell: ({ getValue }) => <span className="font-mono font-bold tracking-wider">{getValue()}</span> },
    { header: 'Email', accessorKey: 'email' },
    { header: 'Phone', accessorKey: 'phone' },
    { header: 'Address', accessorKey: 'address' },
    {
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button onClick={() => setViewingBranch(row.original)} variant="primary" size="sm" title="View Branch Data">
            <Eye className="w-3.5 h-3.5" />
          </Button>
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
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-[var(--color-text-[var(--color-primary-pink)])]">School Branches</h2>
        <Button onClick={handleOpenCreate} className="gap-2">
          <Plus className="w-4 h-4" />
          <span>New Branch</span>
        </Button>
      </div>

      <Table columns={columns} data={branches} isLoading={isLoading} />

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingBranch ? 'Edit Branch' : 'Create Branch'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          {/* Logo Upload */}
          <div className="flex items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">Branch Logo</label>
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
            <Input id="name" label="Branch Name" required error={errors.name} {...register('name')} />
            {!editingBranch && (
              <Input id="code" label="Branch Code" placeholder="BR001" required error={errors.code} {...register('code')} />
            )}
          </div>

          {!editingBranch && (
            <Input id="email" label="Contact Email" type="email" required error={errors.email} {...register('email')} />
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input id="phone" label="Phone" required={!editingBranch} error={errors.phone} {...register('phone')} />
            <Input id="address" label="Address" error={errors.address} {...register('address')} />
          </div>

          {!editingBranch && (
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
            <Button type="submit" isLoading={isCreating || isUpdating}>Save Branch</Button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Suspend Branch"
        message={
          <div>
            <h4 className="font-bold text-red-800 dark:text-red-300 mb-1">Are you sure you want to suspend this branch?</h4>
            <p className="text-red-700/80 dark:text-red-400/80">
              You are about to suspend <strong className="text-red-900 dark:text-red-200">{branchToDelete?.name}</strong>. All branch services and users will be temporarily disabled.
            </p>
          </div>
        }
        confirmText="Suspend Branch"
        isLoading={isDeleting}
      />
    </div>
  );
}
