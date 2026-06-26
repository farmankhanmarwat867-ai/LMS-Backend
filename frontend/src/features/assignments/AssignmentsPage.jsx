import React, { useState } from 'react';
import {
  useGetAssignmentsQuery,
  useCreateAssignmentMutation,
  useUpdateAssignmentMutation,
  useDeleteAssignmentMutation,
  useGetCoursesQuery,
  useGetSubmissionsQuery,
  useGradeSubmissionMutation,
  useCreateSubmissionMutation,
  useDeleteSubmissionMutation
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
import { Plus, Edit2, Trash2, Eye, FileText, UploadCloud, Award } from 'lucide-react';
import { uploadSingleFile } from '../../services/uploadHelper';
import dayjs from 'dayjs';
import ConfirmModal from '../../components/common/ConfirmModal';

const assignmentSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  courseId: z.string().min(1, 'Subject selection is required'),
  maxMarks: z.coerce.number().int().min(1, 'Total marks must be at least 1'),
  dueDate: z.string().min(1, 'Due date is required'),
  status: z.enum(['DRAFT', 'PUBLISHED', 'CLOSED']),
});

export default function AssignmentsPage() {
  const currentUser = useSelector(selectCurrentUser);
  const isTeacher = currentUser?.role === 'TEACHER';
  const isStudent = currentUser?.role === 'STUDENT';

  const [modalOpen, setModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [assignmentToDelete, setAssignmentToDelete] = useState(null);
  
  // Submission Upload States
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedUrl, setUploadedUrl] = useState('');
  const [isSubmittingWork, setIsSubmittingWork] = useState(false);

  // Grading States
  const [gradingModalOpen, setGradingModalOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [marksObtained, setMarksObtained] = useState('');
  const [gradingFeedback, setGradingFeedback] = useState('');

  // API Queries & Mutations
  const { data: assignmentsResponse, isLoading: assignmentsLoading, refetch: refetchAssignments } = useGetAssignmentsQuery();
  const { data: coursesResponse } = useGetCoursesQuery({ limit: 100 });
  const { data: submissionsResponse, refetch: refetchSubmissions } = useGetSubmissionsQuery(
    selectedAssignment ? { assignmentId: selectedAssignment._id } : undefined,
    { skip: !selectedAssignment || !isTeacher }
  );
  
  const { data: mySubmissionsResponse, refetch: refetchMySubmissions } = useGetSubmissionsQuery(
    { my: true },
    { skip: !isStudent }
  );

  const [createAssignment, { isLoading: isCreating }] = useCreateAssignmentMutation();
  const [updateAssignment, { isLoading: isUpdating }] = useUpdateAssignmentMutation();
  const [deleteAssignment, { isLoading: isDeleting }] = useDeleteAssignmentMutation();
  const [createSubmission] = useCreateSubmissionMutation();
  const [deleteSubmission] = useDeleteSubmissionMutation();
  const [gradeSubmission, { isLoading: isGrading }] = useGradeSubmissionMutation();

  const assignments = assignmentsResponse?.data || [];
  const courses = coursesResponse?.data || [];
  const courseOptions = courses.map(c => ({ value: c._id, label: c.title }));
  const submissions = submissionsResponse?.data || [];
  const mySubmissions = mySubmissionsResponse?.data || [];

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(assignmentSchema),
  });

  const handleOpenCreate = () => {
    setEditingAssignment(null);
    reset({ title: '', description: '', courseId: '', maxMarks: 100, dueDate: '', status: 'DRAFT' });
    setModalOpen(true);
  };

  const handleOpenEdit = (assign) => {
    setEditingAssignment(assign);
    reset({
      title: assign.title,
      description: assign.description || '',
      courseId: assign.courseId?._id || assign.courseId || '',
      maxMarks: assign.maxMarks,
      dueDate: dayjs(assign.dueDate).format('YYYY-MM-DD'),
      status: assign.status,
    });
    setModalOpen(true);
  };

  const onSubmit = async (data) => {
    try {
      if (editingAssignment) {
        await updateAssignment({ id: editingAssignment._id, ...data }).unwrap();
        toast.success('Assignment details updated!');
      } else {
        await createAssignment(data).unwrap();
        toast.success('Assignment created!');
      }
      setModalOpen(false);
      refetchAssignments();
    } catch (err) {
      toast.error(err?.data?.message || 'Action failed');
    }
  };

  const handleOpenDelete = (assign) => {
    setAssignmentToDelete(assign);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!assignmentToDelete) return;
    try {
      await deleteAssignment(assignmentToDelete._id).unwrap();
      toast.success('Assignment deleted!');
      setDeleteModalOpen(false);
      setAssignmentToDelete(null);
      refetchAssignments();
    } catch (err) {
      toast.error(err?.data?.message || 'Delete failed');
    }
  };

  const handleOpenDetail = (assign) => {
    setSelectedAssignment(assign);
    setUploadedUrl('');
    setUploadProgress(0);
    setDetailModalOpen(true);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadProgress(1);
      const res = await uploadSingleFile(file, (percent) => {
        setUploadProgress(percent);
      });
      if (res.success) {
        setUploadedUrl(res.data.fileUrl);
        toast.success('File uploaded successfully!');
      } else {
        toast.error('File upload failed');
        setUploadProgress(0);
      }
    } catch (err) {
      toast.error('Failed to upload file');
      setUploadProgress(0);
    }
  };

  const handleSubmitWork = async () => {
    if (!uploadedUrl) return;
    try {
      setIsSubmittingWork(true);
      await createSubmission({
        assignmentId: selectedAssignment._id,
        fileUrl: uploadedUrl,
      }).unwrap();
      toast.success('Assignment work submitted successfully!');
      setDetailModalOpen(false);
      refetchAssignments();
      if (isStudent) refetchMySubmissions();
    } catch (err) {
      toast.error(err?.data?.message || 'Submission failed');
    } finally {
      setIsSubmittingWork(false);
    }
  };

  const handleUnsubmitWork = async (submissionId) => {
    try {
      await deleteSubmission(submissionId).unwrap();
      toast.success('Submission removed successfully!');
      if (isStudent) refetchMySubmissions();
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to unsubmit');
    }
  };

  const handleOpenGrading = (sub) => {
    setSelectedSubmission(sub);
    setMarksObtained(sub.marksObtained !== undefined ? sub.marksObtained : '');
    setGradingFeedback(sub.feedback || '');
    setGradingModalOpen(true);
  };

  const handleSaveGrade = async () => {
    try {
      await gradeSubmission({
        id: selectedSubmission._id,
        marksObtained: Number(marksObtained),
        feedback: gradingFeedback,
        status: 'GRADED',
      }).unwrap();
      toast.success('Submission graded successfully!');
      setGradingModalOpen(false);
      refetchSubmissions();
    } catch (err) {
      toast.error(err?.data?.message || 'Grading failed');
    }
  };

  const columns = [
    { header: 'Title', accessorKey: 'title', cell: ({ getValue }) => <span className="font-semibold">{getValue()}</span> },
    { header: 'Subject', accessorKey: 'courseId.name', cell: ({ row }) => row.original.courseId?.name || row.original.courseId?.title || 'N/A' },
    { header: 'Due Date', accessorKey: 'dueDate', cell: ({ getValue }) => dayjs(getValue()).format('MMM DD, YYYY') },
    { header: 'Total Marks', accessorKey: 'maxMarks' },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: ({ row, getValue }) => {
        let val = getValue();
        let isSubmitted = false;

        if (isStudent) {
          const mySub = mySubmissions.find(s => s.assignmentId === row.original._id || s.assignmentId?._id === row.original._id);
          if (mySub) {
            val = mySub.status || 'SUBMITTED';
            isSubmitted = true;
          }
        }

        const colors = {
          DRAFT: 'bg-amber-100 text-amber-800 dark:bg-amber-950/20',
          PUBLISHED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/20',
          CLOSED: 'bg-rose-100 text-rose-800 dark:bg-rose-950/20',
          SUBMITTED: 'bg-blue-100 text-blue-800 dark:bg-blue-950/20',
          GRADED: 'bg-purple-100 text-purple-800 dark:bg-purple-950/20',
        };
        return <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${colors[val] || colors.PUBLISHED}`}>{val}</span>;
      },
    },
    {
      header: 'Actions',
      cell: ({ row }) => {
        const a = row.original;
        
        let mySub = null;
        let canUnsubmit = false;
        if (isStudent) {
          mySub = mySubmissions.find(s => s.assignmentId === a._id || s.assignmentId?._id === a._id);
          if (mySub && mySub.status !== 'GRADED' && dayjs().isBefore(dayjs(a.dueDate))) {
            canUnsubmit = true;
          }
        }

        return (
          <div className="flex gap-2 items-center">
            <Button onClick={() => handleOpenDetail(a)} variant="secondary" size="sm" className="gap-1">
              <Eye className="w-3.5 h-3.5" />
              <span>View</span>
            </Button>
            {canUnsubmit && (
               <Button onClick={() => handleUnsubmitWork(mySub._id)} variant="danger" size="sm" className="gap-1">
                 <span>Unsubmit</span>
               </Button>
            )}
            {isTeacher && (
              <>
                <Button onClick={() => handleOpenEdit(a)} variant="outline" size="sm">
                  <Edit2 className="w-3.5 h-3.5" />
                </Button>
                 <Button onClick={() => handleOpenDelete(a)} variant="danger" size="sm">
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 items-start">
        <h2 className="text-xl font-bold text-[var(--color-text-[var(--color-primary-pink)])]">Assignments</h2>
        {isTeacher && (
          <Button onClick={handleOpenCreate} className="gap-2">
            <Plus className="w-4 h-4" />
            <span>Create Assignment</span>
          </Button>
        )}
      </div>

      <Table columns={columns} data={assignments} isLoading={assignmentsLoading} />

      {/* Create / Edit Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingAssignment ? 'Edit Assignment' : 'Create Assignment'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input id="title" label="Assignment Title" required error={errors.title} {...register('title')} />
          <Input id="description" label="Description / Instructions" error={errors.description} {...register('description')} />
          
          <div className="grid grid-cols-2 gap-4">
            <Select
              id="courseId"
              label="Associated Subject"
              required
              options={courseOptions}
              placeholder="Select Subject"
              error={errors.courseId}
              {...register('courseId')}
            />
            <Input id="maxMarks" label="Total Marks" type="number" required error={errors.maxMarks} {...register('maxMarks')} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input id="dueDate" label="Due Date" type="date" required error={errors.dueDate} {...register('dueDate')} />
            <Select
              id="status"
              label="Status"
              required
              options={[
                { value: 'DRAFT', label: 'Draft' },
                { value: 'PUBLISHED', label: 'Published' },
                { value: 'CLOSED', label: 'Closed' },
              ]}
              error={errors.status}
              {...register('status')}
            />
          </div>
          
          <div className="flex justify-end gap-2 pt-4 border-t border-black/5 dark:border-white/5">
            <Button onClick={() => setModalOpen(false)} variant="outline">Cancel</Button>
            <Button type="submit" isLoading={isCreating || isUpdating}>Save Assignment</Button>
          </div>
        </form>
      </Modal>

      {/* Assignment Detail / Submission Panel */}
      <Modal isOpen={detailModalOpen} onClose={() => setDetailModalOpen(false)} title={selectedAssignment?.title} size="lg">
        <div className="space-y-6">
          <div className="p-4 bg-white/5 rounded-xl space-y-2 text-sm text-slate-700 dark:text-slate-300">
            <p><strong>Instructions:</strong> {selectedAssignment?.description || 'No instructions provided.'}</p>
            <p><strong>Total Marks:</strong> {selectedAssignment?.maxMarks}</p>
            <p><strong>Due Date:</strong> {dayjs(selectedAssignment?.dueDate).format('MMM DD, YYYY')}</p>
            <p><strong>Status:</strong> <span className="font-semibold text-[var(--color-primary-pink)]">{selectedAssignment?.status}</span></p>
          </div>

          {/* Student Upload Mode */}
          {isStudent && selectedAssignment?.status === 'PUBLISHED' && 
            !mySubmissions.find(s => s.assignmentId === selectedAssignment._id || s.assignmentId?._id === selectedAssignment._id) && (
            <div className="space-y-4">
              <h4 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text-[var(--color-primary-pink)])] dark:text-slate-200">Your Submission</h4>
              <div className="border-2 border-dashed border-slate-300 dark:border-slate-800 rounded-xl p-8 text-center bg-[var(--color-primary-pink)]/5/50 hover:bg-[var(--color-primary-pink)]/5/80 dark:bg-slate-900/40 transition-colors relative">
                <input
                  type="file"
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={uploadProgress > 0 && uploadProgress < 100}
                />
                <UploadCloud className="w-12 h-12 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Click or drag file to upload</p>
                <p className="text-xs text-slate-400 mt-1">PDF, Word, Images up to 10MB</p>

                {uploadProgress > 0 && (
                  <div className="mt-4">
                    <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2">
                      <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${uploadProgress}%` }}></div>
                    </div>
                    <span className="text-xs text-[var(--color-text-secondary)] mt-1 inline-block">{uploadProgress}% uploaded</span>
                  </div>
                )}
              </div>

              {uploadedUrl && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-400 border border-emerald-200 text-xs">
                  <FileText className="w-4 h-4 shrink-0" />
                  <span className="truncate flex-1">{uploadedUrl}</span>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button onClick={() => setDetailModalOpen(false)} variant="outline">Close</Button>
                <Button onClick={handleSubmitWork} isLoading={isSubmittingWork} disabled={!uploadedUrl}>Submit Work</Button>
              </div>
            </div>
          )}

          {/* Student Submission Details (If already submitted) */}
          {isStudent && (() => {
            const mySub = mySubmissions.find(s => s.assignmentId === selectedAssignment?._id || s.assignmentId?._id === selectedAssignment?._id);
            if (!mySub) return null;
            return (
              <div className="space-y-4 pt-4 border-t border-black/5 dark:border-white/5">
                <h4 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text-[var(--color-primary-pink)])] dark:text-slate-200">Your Submission Details</h4>
                <div className="p-4 bg-white/5 rounded-xl space-y-2 text-sm text-slate-700 dark:text-slate-300">
                  <p><strong>Status:</strong> <span className="font-semibold">{mySub.status}</span></p>
                  {mySub.status === 'GRADED' && (
                    <>
                      <p><strong>Marks Obtained:</strong> {mySub.marksObtained} / {selectedAssignment.maxMarks}</p>
                      <p><strong>Feedback:</strong> {mySub.feedback || 'No feedback'}</p>
                    </>
                  )}
                  {mySub.fileUrl && (
                    <a href={mySub.fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-[var(--color-primary-pink)] font-semibold hover:underline mt-2">
                      <FileText className="w-3.5 h-3.5" />
                      <span>View My Submitted Work</span>
                    </a>
                  )}
                </div>
                <div className="flex justify-end gap-2">
                  <Button onClick={() => setDetailModalOpen(false)} variant="outline">Close</Button>
                </div>
              </div>
            );
          })()}

          {/* Teacher Submissions Grading Panel */}
          {isTeacher && (
            <div className="space-y-4 pt-4 border-t border-black/5 dark:border-white/5">
              <h4 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text-[var(--color-primary-pink)])] dark:text-slate-200">Student Submissions</h4>
              <div className="space-y-3">
                {submissions.length === 0 ? (
                  <p className="text-xs text-slate-550 dark:text-slate-400 text-center py-4 font-medium">No submissions received yet.</p>
                ) : (
                  submissions.map((sub, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 rounded-xl border border-black/5 dark:border-white/5 bg-white dark:bg-slate-900 shadow-xs">
                      <div>
                        <p className="text-sm font-bold text-[var(--color-text-[var(--color-primary-pink)])] dark:text-slate-200">{sub.studentId?.name || 'Student'}</p>
                        <p className="text-xs text-slate-400 mt-1">Submitted: {dayjs(sub.submittedAt).format('MMM DD, YYYY')}</p>
                        {sub.fileUrl && (
                          <a href={sub.fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-[var(--color-primary-pink)] font-semibold hover:underline mt-2">
                            <FileText className="w-3.5 h-3.5" />
                            <span>View Work Attachment</span>
                          </a>
                        )}
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{sub.status}</p>
                          {sub.marksObtained !== undefined && (
                            <p className="text-xs text-[var(--color-text-secondary)] mt-1 font-semibold">Marks: {sub.marksObtained} / {selectedAssignment.maxMarks}</p>
                          )}
                        </div>
                        <Button onClick={() => handleOpenGrading(sub)} variant="outline" size="sm" className="gap-1.5">
                          <Award className="w-3.5 h-3.5" />
                          <span>Grade</span>
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Grade Submission Dialog */}
      <Modal isOpen={gradingModalOpen} onClose={() => setGradingModalOpen(false)} title="Grade Student Work">
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Grading work for <strong>{selectedSubmission?.studentId?.name}</strong> on assignment <strong>{selectedAssignment?.title}</strong>
          </p>
          
          <Input
            id="marksObtained"
            label={`Obtained Marks (Max: ${selectedAssignment?.maxMarks})`}
            type="number"
            value={marksObtained}
            onChange={(e) => setMarksObtained(e.target.value)}
          />

          <Input
            id="feedback"
            label="Feedback / Comments"
            type="text"
            value={gradingFeedback}
            onChange={(e) => setGradingFeedback(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-4">
            <Button onClick={() => setGradingModalOpen(false)} variant="outline">Cancel</Button>
            <Button onClick={handleSaveGrade} isLoading={isGrading}>Submit Grade</Button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Assignment"
        message={
          <div>
            <h4 className="font-bold text-red-800 dark:text-red-300 mb-1">Are you sure you want to delete this assignment?</h4>
            <p className="text-red-700/80 dark:text-red-400/80">
              You are about to delete <strong className="text-red-900 dark:text-red-200">{assignmentToDelete?.title}</strong>. All student submissions linked to this assignment will be permanently deleted. This action is irreversible.
            </p>
          </div>
        }
        confirmText="Delete Assignment"
        isLoading={isDeleting}
      />
    </div>
  );
}
