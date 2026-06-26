import React, { useState, useRef, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { selectCurrentUser, selectTenantContext } from '../../app/authSlice';
import {
  useGetUsersQuery,
  useCreateUserMutation,
  useBulkImportStudentsMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useChangeUserStatusMutation,
  useGetBranchesQuery,
  useGetClassesQuery,
  useGetSectionsQuery
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
import { Plus, Edit2, Link2, Trash2, ShieldAlert, ShieldCheck, Upload, Download, FileText, CheckCircle2, XCircle, AlertTriangle, Users } from 'lucide-react';
import uploadAxios from '../../services/uploadHelper';
import ConfirmModal from '../../components/common/ConfirmModal';

const userSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters').optional().or(z.literal('')),
  role: z.enum(['INSTITUTE_ADMIN', 'BRANCH_ADMIN', 'TEACHER', 'STUDENT', 'PARENT']),
  phone: z.string().optional(),
  branchId: z.string().optional(),
  classId: z.string().optional().nullable(),
  sectionId: z.string().optional().nullable(),
}).superRefine((data, ctx) => {
  if (data.role !== 'INSTITUTE_ADMIN' && !data.branchId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['branchId'],
      message: 'Branch is required for this role',
    });
  }
});

export default function UsersPage() {
  const [roleFilter, setRoleFilter] = useState('TEACHER');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [modalOpen, setModalOpen] = useState(false);
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [selectedParent, setSelectedParent] = useState(null);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [editingUser, setEditingUser] = useState(null);

  const currentUser = useSelector(selectCurrentUser);
  const tenant = useSelector(selectTenantContext);
  const isBranchAdmin = currentUser?.role === 'BRANCH_ADMIN';

  const { data: response, isLoading, refetch } = useGetUsersQuery({
    role: roleFilter,
    search: searchQuery || undefined,
    page,
    limit: pageSize,
  });

  const { data: branchesResponse } = useGetBranchesQuery();
  const { data: studentsResponse } = useGetUsersQuery({ role: 'STUDENT', limit: 100 });
  const { data: classesResponse } = useGetClassesQuery({ limit: 100 });
  const { data: sectionsResponse } = useGetSectionsQuery({ limit: 100 });

  const [createUser, { isLoading: isCreating }] = useCreateUserMutation();
  const [updateUser, { isLoading: isUpdating }] = useUpdateUserMutation();
  const [changeStatus] = useChangeUserStatusMutation();
  const [deleteUser, { isLoading: isDeletingUser }] = useDeleteUserMutation();

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

  const [unlinkModalOpen, setUnlinkModalOpen] = useState(false);
  const [unlinkData, setUnlinkData] = useState(null); // { parentId, studentId, parentName, studentName }
  const [isUnlinking, setIsUnlinking] = useState(false);

  const users = response?.data?.docs || response?.data || [];
  const totalPages = response?.data?.totalPages || 1;

  const branches = branchesResponse?.data || [];
  const branchOptions = branches.map(b => ({ value: b._id, label: b.name }));

  const students = studentsResponse?.data?.docs || studentsResponse?.data || [];
  const studentOptions = students.map(s => ({ value: s._id, label: `${s.name} (${s.email})` }));

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(userSchema),
    defaultValues: {
      role: 'TEACHER',
      branchId: '',
      classId: '',
      sectionId: '',
    }
  });

  const watchRole = watch('role');
  const watchClassId = watch('classId');

  const classes = classesResponse?.data || [];
  const classOptions = classes.map(c => ({ value: c._id, label: c.name }));

  const sections = sectionsResponse?.data || [];
  const filteredSections = watchClassId
    ? sections.filter(s => (s.classId?._id || s.classId) === watchClassId)
    : sections;

  const sectionOptions = filteredSections.map(s => ({ value: s._id, label: s.name }));

  const handleOpenCreate = () => {
    setEditingUser(null);
    const defaultBranchId = isBranchAdmin ? (tenant?.branchId?.toString() || '') : '';
    reset({ name: '', email: '', password: '', role: roleFilter, phone: '', branchId: defaultBranchId, classId: '', sectionId: '' });
    setModalOpen(true);
  };

  const handleOpenEdit = (user) => {
    setEditingUser(user);
    const defaultBranchId = isBranchAdmin ? (tenant?.branchId?.toString() || '') : '';
    reset({
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      role: user.role,
      branchId: user.branchId?._id || user.branchId || defaultBranchId,
      classId: user.classId?._id || user.classId || '',
      sectionId: user.sectionId?._id || user.sectionId || '',
      password: '',
    });
    setModalOpen(true);
  };

  const onSubmit = async (data) => {
    try {
      const payload = {
        ...data,
        classId: data.role === 'STUDENT' ? (data.classId || null) : null,
        sectionId: data.role === 'STUDENT' ? (data.sectionId || null) : null,
      };
      if (editingUser) {
        await updateUser({
          id: editingUser._id,
          name: data.name,
          email: data.email,
          phone: data.phone,
          branchId: data.branchId || undefined,
          classId: payload.classId,
          sectionId: payload.sectionId,
        }).unwrap();
        toast.success('User details updated successfully!');
      } else {
        if (!payload.password) {
          payload.password = 'Edu123456'; // Default temporary password
        }
        await createUser(payload).unwrap();
        toast.success('User registered successfully!');
        setSearchQuery('');
        setRoleFilter(payload.role);
      }
      setModalOpen(false);
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || 'Action failed');
    }
  };

  const handleToggleStatus = async (userRecord) => {
    try {
      const newStatus = !userRecord.isActive;
      await changeStatus({ id: userRecord._id, isActive: newStatus }).unwrap();
      toast.success(`User ${newStatus ? 'activated' : 'deactivated'} successfully!`);
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to toggle status');
    }
  };

  const handleOpenDelete = (user) => {
    setUserToDelete(user);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    try {
      await deleteUser(userToDelete._id).unwrap();
      toast.success('User deleted successfully!');
      setDeleteModalOpen(false);
      setUserToDelete(null);
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || 'Delete failed');
    }
  };

  // Parent Student Linking Handlers
  const handleOpenLink = (parent) => {
    setSelectedParent(parent);
    setSelectedStudentId('');
    setLinkModalOpen(true);
  };

  const handleLinkStudent = async () => {
    if (!selectedStudentId) return;
    try {
      const res = await uploadAxios.post(`/users/parents/${selectedParent._id}/link/${selectedStudentId}`);
      if (res.data.success) {
        toast.success('Student linked successfully!');
        setLinkModalOpen(false);
        refetch();
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to link student');
    }
  };

  const handleOpenUnlink = (parent, kid) => {
    setUnlinkData({
      parentId: parent._id,
      studentId: kid._id,
      parentName: parent.name,
      studentName: kid.name,
    });
    setUnlinkModalOpen(true);
  };

  const handleConfirmUnlink = async () => {
    if (!unlinkData) return;
    try {
      setIsUnlinking(true);
      const res = await uploadAxios.delete(`/users/parents/${unlinkData.parentId}/unlink/${unlinkData.studentId}`);
      if (res.data.success) {
        toast.success('Student unlinked!');
        setUnlinkModalOpen(false);
        setUnlinkData(null);
        refetch();
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to unlink');
    } finally {
      setIsUnlinking(false);
    }
  };

  const columns = [
    { header: 'Full Name', accessorKey: 'name', cell: ({ row }) => <span className="font-semibold">{row.original.name}</span> },
    { header: 'Email Address', accessorKey: 'email' },
    { header: 'Phone', accessorKey: 'phone', cell: ({ getValue }) => getValue() || 'N/A' },
    ...(roleFilter === 'STUDENT' ? [
      { header: 'Class', accessorKey: 'classId.name', cell: ({ row }) => row.original.classId?.name || 'N/A' },
      { header: 'Section', accessorKey: 'sectionId.name', cell: ({ row }) => row.original.sectionId?.name || 'N/A' }
    ] : [
      { header: 'Role', accessorKey: 'role' }
    ]),
    {
      header: 'Status',
      accessorKey: 'isActive',
      cell: ({ row }) => (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${row.original.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
          {row.original.isActive ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      header: 'Relationships / Actions',
      cell: ({ row }) => {
        const u = row.original;
        return (
          <div className="flex items-center gap-2">
            {u.role === 'PARENT' && (
              <div className="flex flex-col gap-1 items-start">
                <Button onClick={() => handleOpenLink(u)} variant="outline" size="sm" className="gap-1">
                  <Link2 className="w-3.5 h-3.5" />
                  <span>Link Kid</span>
                </Button>
                {u.parentOf && u.parentOf.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {u.parentOf.map((kid) => (
                      <span key={kid._id} className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 text-[10px] px-1.5 py-0.5 rounded-sm">
                        {kid.name}
                        <button onClick={() => handleOpenUnlink(u, kid)} className="text-red-500 hover:text-red-700 font-bold ml-1">×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
            <Button
              onClick={() => handleOpenEdit(u)}
              variant="secondary"
              size="sm"
              className="p-1.5"
              title="Edit User Details"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </Button>
            <Button
              onClick={() => handleToggleStatus(u)}
              variant={u.isActive ? 'secondary' : 'success'}
              size="sm"
              className="p-1.5"
              title={u.isActive ? 'Deactivate User' : 'Activate User'}
            >
              {u.isActive ? (
                <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
              ) : (
                <ShieldCheck className="w-3.5 h-3.5" />
              )}
            </Button>
            <Button
              onClick={() => handleOpenDelete(u)}
              variant="danger"
              size="sm"
              className="p-1.5"
              title="Delete User"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        );
      },
    },
  ];

  const rolesList = isBranchAdmin 
    ? ['TEACHER', 'STUDENT', 'PARENT']
    : ['TEACHER', 'STUDENT', 'PARENT', 'BRANCH_ADMIN', 'INSTITUTE_ADMIN'];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-[var(--color-text-[var(--color-primary-pink)])]">User Directory</h2>
        <div className="flex gap-3">
          {(roleFilter === 'STUDENT') && (
            <Button onClick={() => setBulkImportOpen(true)} variant="outline" className="gap-2">
              <Upload className="w-4 h-4" />
              <span>Bulk Import Students</span>
            </Button>
          )}
          <Button onClick={handleOpenCreate} className="gap-2">
            <Plus className="w-4 h-4" />
            <span>Register User</span>
          </Button>
        </div>
      </div>

      {/* Tabs and Filters */}
      <div className="flex flex-wrap gap-4 items-center justify-between bg-white dark:bg-slate-900 p-4 border border-black/5 dark:border-white/5 rounded-xl shadow-xs">
        <div className="flex flex-wrap gap-2">
          {rolesList.map((r) => (
            <button
              key={r}
              onClick={() => {
                setRoleFilter(r);
                setSearchQuery('');
                setPage(1);
              }}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all uppercase tracking-wide ${
                roleFilter === r
                  ? 'bg-primary text-white shadow-md shadow-primary/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {r.replace('_', ' ')}s
            </button>
          ))}
        </div>

        <div className="w-full sm:w-64">
          <Input
            id="userDirectorySearch"
            type="text"
            placeholder="Search name/email..."
            autoComplete="off"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      <Table
        columns={columns}
        data={users}
        isLoading={isLoading}
        currentPage={page}
        pageCount={totalPages}
        onPageIndexChange={setPage}
        onPageSizeChange={setPageSize}
        pageSize={pageSize}
      />

      {/* Register User Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingUser ? 'Edit User Details' : 'Register New User'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input id="name" label="Full Name" required error={errors.name} {...register('name')} />
          <Input id="email" label="Email Address" type="email" required error={errors.email} {...register('email')} />
          
          <div className={`grid gap-4 ${isBranchAdmin ? 'grid-cols-1' : 'grid-cols-2'}`}>
            <Input id="phone" label="Phone" error={errors.phone} {...register('phone')} />
            {!isBranchAdmin && (
              <Select
                id="branchId"
                label={watchRole === 'INSTITUTE_ADMIN' ? 'Select Branch (Optional)' : 'Select Branch'}
                required={watchRole !== 'INSTITUTE_ADMIN'}
                options={branchOptions}
                placeholder="Select Branch"
                error={errors.branchId}
                {...register('branchId')}
              />
            )}
            {isBranchAdmin && (
              <input type="hidden" {...register('branchId')} />
            )}
          </div>

          <div className={editingUser ? 'grid grid-cols-1' : 'grid grid-cols-2 gap-4'}>
            <Select
              id="role"
              label="User Role"
              required
              options={rolesList.map((r) => ({ value: r, label: r.replace('_', ' ') }))}
              error={errors.role}
              disabled={!!editingUser}
              {...register('role')}
            />
            {!editingUser && (
              <Input id="password" label="Temporary Password" placeholder="Edu123456" error={errors.password} {...register('password')} />
            )}
          </div>

          {watchRole === 'STUDENT' && (
            <div className="grid grid-cols-2 gap-4">
              <Select
                id="classId"
                label="Class (Optional)"
                options={[{ value: '', label: 'Select Class (Optional)' }, ...classOptions]}
                placeholder="Select Class"
                error={errors.classId}
                {...register('classId')}
              />
              <Select
                id="sectionId"
                label="Section (Optional)"
                options={[{ value: '', label: 'Select Section (Optional)' }, ...sectionOptions]}
                placeholder="Select Section"
                disabled={!watchClassId}
                error={errors.sectionId}
                {...register('sectionId')}
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t border-black/5 dark:border-slate-850">
            <Button onClick={() => setModalOpen(false)} variant="outline">Cancel</Button>
            <Button type="submit" isLoading={isCreating || isUpdating}>
              {editingUser ? 'Save Changes' : 'Register'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Link Kid Modal */}
      <Modal isOpen={linkModalOpen} onClose={() => setLinkModalOpen(false)} title={`Link Student to ${selectedParent?.name}`}>
        <div className="space-y-4">
          <Select
            id="studentLinkSelect"
            label="Choose Student"
            options={studentOptions}
            placeholder="Search student..."
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(e.target.value)}
          />
          <div className="flex justify-end gap-2 pt-4">
            <Button onClick={() => setLinkModalOpen(false)} variant="outline">Cancel</Button>
            <Button onClick={handleLinkStudent} disabled={!selectedStudentId}>Link Student</Button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete User Account"
        message={
          <div>
            <h4 className="font-bold text-red-800 dark:text-red-300 mb-1">Are you sure you want to delete this user?</h4>
            <p className="text-red-700/80 dark:text-red-400/80">
              You are about to delete the user account for <strong className="text-red-900 dark:text-red-200">{userToDelete?.name}</strong> (<span className="font-mono text-xs">{userToDelete?.email}</span> - role: <strong className="text-red-900 dark:text-red-200">{userToDelete?.role}</strong>). All files, records, and relationships associated with this account will be lost. This action is irreversible.
            </p>
          </div>
        }
        confirmText="Delete User"
        isLoading={isDeletingUser}
      />

      <ConfirmModal
        isOpen={unlinkModalOpen}
        onClose={() => setUnlinkModalOpen(false)}
        onConfirm={handleConfirmUnlink}
        title="Unlink Student from Parent"
        message={
          <div>
            <h4 className="font-bold text-red-800 dark:text-red-300 mb-1">Are you sure you want to unlink this relationship?</h4>
            <p className="text-red-700/80 dark:text-red-400/80">
              You are about to unlink the student <strong className="text-red-900 dark:text-red-200">{unlinkData?.studentName}</strong> from their parent account <strong className="text-red-900 dark:text-red-200">{unlinkData?.parentName}</strong>. The parent will no longer see grades, attendance, or fees for this child.
            </p>
          </div>
        }
        confirmText="Unlink Relationship"
        isLoading={isUnlinking}
      />

      {/* Bulk Import Modal */}
      <BulkImportStudentsModal
        isOpen={bulkImportOpen}
        onClose={() => setBulkImportOpen(false)}
        branches={branches}
        classes={classesResponse?.data || []}
        sections={sectionsResponse?.data || []}
        onSuccess={() => { setBulkImportOpen(false); refetch(); }}
      />
    </div>
  );
}

// ─── Bulk Import Students Modal ────────────────────────────────────────────────
function BulkImportStudentsModal({ isOpen, onClose, branches, classes, sections, onSuccess }) {
  const currentUser = useSelector(selectCurrentUser);
  const isBranchAdmin = currentUser?.role === 'BRANCH_ADMIN';
  const defaultBranchId = isBranchAdmin ? currentUser.branchId : '';

  const [step, setStep] = useState('upload'); // 'upload' | 'preview' | 'results'
  const [parsedRows, setParsedRows] = useState([]);
  const [results, setResults] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedBranchId, setSelectedBranchId] = useState(defaultBranchId);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const fileInputRef = useRef(null);
  const [bulkImport, { isLoading }] = useBulkImportStudentsMutation();

  const filteredSections = selectedClassId
    ? sections.filter(s => (s.classId?._id || s.classId) === selectedClassId)
    : sections;

  const parseCSV = useCallback((text) => {
    const lines = text.trim().split('\n').filter(l => l.trim());
    if (lines.length < 2) {
      toast.error('CSV must have a header row and at least one data row');
      return;
    }
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const rows = lines.slice(1).map((line, i) => {
      const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
      const row = {};
      headers.forEach((h, idx) => { row[h] = values[idx] || ''; });
      row._rowNum = i + 2;
      return row;
    }).filter(r => r.name || r.email);
    if (rows.length === 0) {
      toast.error('No valid rows found in CSV');
      return;
    }
    setParsedRows(rows);
    setStep('preview');
  }, []);

  const handleFileDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer?.files[0] || e.target.files[0];
    if (!file) return;
    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a .csv file');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => parseCSV(ev.target.result);
    reader.readAsText(file);
  }, [parseCSV]);

  const downloadTemplate = () => {
    const csv = 'name,email,phone,password\nAhmed Khan,ahmed@school.com,03001234567,Edu123456\nFatima Raza,fatima@school.com,03009876543,Edu123456';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'students_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    if (!selectedBranchId) {
      toast.error('Please select a branch before importing');
      return;
    }
    const students = parsedRows.map(r => ({
      name:      r.name,
      email:     r.email,
      phone:     r.phone     || '',
      password:  r.password  || 'Edu123456',
      branchId:  selectedBranchId,
      classId:   selectedClassId   || undefined,
      sectionId: selectedSectionId || undefined,
    }));
    try {
      const res = await bulkImport({ students }).unwrap();
      setResults(res.data || res);
      setStep('results');
      if (res.data?.created?.length > 0) {
        toast.success(`${res.data.created.length} students imported!`);
        onSuccess();
      }
    } catch (err) {
      toast.error(err?.data?.message || 'Import failed');
    }
  };

  const handleClose = () => {
    setStep('upload');
    setParsedRows([]);
    setResults(null);
    setSelectedBranchId(defaultBranchId);
    setSelectedClassId('');
    setSelectedSectionId('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Bulk Import Students" size="xl">
      <div className="space-y-5">

        {/* Steps Indicator */}
        <div className="flex items-center gap-2 text-xs font-semibold">
          {['upload', 'preview', 'results'].map((s, idx) => (
            <React.Fragment key={s}>
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all ${step === s ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-800 text-[var(--color-text-secondary)]'}`}>
                <span>{idx + 1}</span>
                <span className="capitalize">{s}</span>
              </div>
              {idx < 2 && <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />}
            </React.Fragment>
          ))}
        </div>

        {/* Step 1: Upload */}
        {step === 'upload' && (
          <div className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
                <p className="font-bold">CSV Format Required</p>
                <p>Your file must have these headers: <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded text-xs">name, email, phone, password</code></p>
                <p className="text-xs">Password is optional — defaults to <strong>Edu123456</strong> if blank.</p>
              </div>
            </div>

            <button
              onClick={downloadTemplate}
              className="flex items-center gap-2 text-sm text-[var(--color-primary-pink)] font-semibold hover:underline"
            >
              <Download className="w-4 h-4" />
              Download CSV Template
            </button>

            {/* Drag & Drop Zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all ${isDragging ? 'border-primary bg-primary/5 scale-[1.01]' : 'border-slate-300 dark:border-slate-700 hover:border-primary/50 hover:bg-[var(--color-primary-pink)]/5 dark:hover:bg-slate-900'}`}
            >
              <div className="w-14 h-14 rounded-2xl bg-[var(--color-primary-pink)]/10 flex items-center justify-center">
                <FileText className="w-7 h-7 text-[var(--color-primary-pink)]" />
              </div>
              <div className="text-center">
                <p className="font-bold text-slate-700 dark:text-slate-200">Drag & Drop your CSV here</p>
                <p className="text-sm text-[var(--color-text-secondary)] mt-1">or click to browse files</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileDrop}
              />
            </div>
          </div>
        )}

        {/* Step 2: Preview + Settings */}
        {step === 'preview' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--color-status-success)] dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              {parsedRows.length} students parsed from CSV — assign placement below
            </div>

            {/* Assignment Settings */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-[var(--color-primary-pink)]/5 dark:bg-slate-900 border border-black/5 dark:border-white/5 rounded-xl p-4">
              <div>
                <label className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider block mb-1">Branch <span className="text-red-500">*</span></label>
                {isBranchAdmin ? (
                  <div className="w-full px-3 py-2 border border-black/5 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 rounded-lg text-sm text-slate-700 dark:text-slate-300 font-semibold cursor-not-allowed">
                    {branches.find(b => b._id === defaultBranchId)?.name || 'Your Branch'}
                  </div>
                ) : (
                  <select
                    className="w-full px-3 py-2 border border-black/5 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    value={selectedBranchId}
                    onChange={e => setSelectedBranchId(e.target.value)}
                  >
                    <option value="">Select Branch</option>
                    {branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
                  </select>
                )}
              </div>
              <div>
                <label className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider block mb-1">Class (Optional)</label>
                <select
                  className="w-full px-3 py-2 border border-black/5 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  value={selectedClassId}
                  onChange={e => { setSelectedClassId(e.target.value); setSelectedSectionId(''); }}
                >
                  <option value="">No Class</option>
                  {classes.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider block mb-1">Section (Optional)</label>
                <select
                  className="w-full px-3 py-2 border border-black/5 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  disabled={!selectedClassId}
                  value={selectedSectionId}
                  onChange={e => setSelectedSectionId(e.target.value)}
                >
                  <option value="">No Section</option>
                  {filteredSections.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                </select>
              </div>
            </div>

            {/* Preview Table */}
            <div className="max-h-64 overflow-y-auto border border-black/5 dark:border-white/5 rounded-xl">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 dark:bg-slate-800 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-bold text-[var(--color-text-secondary)] uppercase">#</th>
                    <th className="px-3 py-2 text-left text-xs font-bold text-[var(--color-text-secondary)] uppercase">Name</th>
                    <th className="px-3 py-2 text-left text-xs font-bold text-[var(--color-text-secondary)] uppercase">Email</th>
                    <th className="px-3 py-2 text-left text-xs font-bold text-[var(--color-text-secondary)] uppercase">Phone</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {parsedRows.map((r, i) => (
                    <tr key={i} className="hover:bg-[var(--color-primary-pink)]/5 dark:hover:bg-slate-900/50">
                      <td className="px-3 py-2 text-slate-400 text-xs">{r._rowNum}</td>
                      <td className="px-3 py-2 font-semibold text-[var(--color-text-[var(--color-primary-pink)])] dark:text-slate-200">{r.name || <span className="text-red-400">Missing!</span>}</td>
                      <td className="px-3 py-2 text-slate-600 dark:text-slate-400">{r.email || <span className="text-red-400">Missing!</span>}</td>
                      <td className="px-3 py-2 text-[var(--color-text-secondary)]">{r.phone || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              <button onClick={() => { setStep('upload'); setParsedRows([]); }} className="text-sm text-[var(--color-text-secondary)] hover:text-slate-700 dark:hover:text-slate-300 font-semibold">← Re-upload</button>
              <Button onClick={handleImport} isLoading={isLoading} className="gap-2">
                <Users className="w-4 h-4" />
                Import {parsedRows.length} Students
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Results */}
        {step === 'results' && results && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 text-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-3xl font-black text-[var(--color-status-success)] dark:text-emerald-400">{results.created?.length || 0}</p>
                <p className="text-sm text-emerald-700 dark:text-emerald-300 font-semibold mt-1">Successfully Created</p>
              </div>
              <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-4 text-center">
                <XCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
                <p className="text-3xl font-black text-red-500">{results.failed?.length || 0}</p>
                <p className="text-sm text-[var(--color-status-error)] dark:text-red-400 font-semibold mt-1">Failed / Skipped</p>
              </div>
            </div>

            {results.failed?.length > 0 && (
              <div className="border border-red-200 dark:border-red-800 rounded-xl overflow-hidden">
                <div className="bg-red-50 dark:bg-red-950/30 px-4 py-2 text-xs font-bold text-[var(--color-status-error)] dark:text-red-400 uppercase tracking-wider">Failed Rows</div>
                <div className="max-h-48 overflow-y-auto divide-y divide-red-100 dark:divide-red-900">
                  {results.failed.map((f, i) => (
                    <div key={i} className="px-4 py-2 flex items-center justify-between text-sm">
                      <div>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">Row {f.row}:</span>
                        <span className="text-[var(--color-text-secondary)] ml-2">{f.email}</span>
                      </div>
                      <span className="text-red-500 text-xs font-semibold ml-4 text-right">{f.reason}</span>
                    </div>
                  ))}
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
