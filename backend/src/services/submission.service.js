const submissionRepository = require('../repositories/submission.repository');
const assignmentRepository = require('../repositories/assignment.repository');
const enrollmentRepository = require('../repositories/enrollment.repository');
const AuditLogger = require('../utils/auditLogger');
const { ROLES } = require('../constants/roles');

// ── Submit / Update Submission ───────────────────────────────────────────────
const submitAssignment = async (assignmentId, data, user, tenantFilter) => {
  // 1. Validate assignment
  const assignment = await assignmentRepository.findById(assignmentId);
  if (!assignment || assignment.isDeleted) {
    throw { status: 404, message: 'Assignment not found' };
  }

  if (assignment.status !== 'PUBLISHED') {
    throw { status: 400, message: 'Assignment is not open for submission' };
  }

  // 2. Validate enrollment
  const isEnrolled = await enrollmentRepository.findOne({
    studentId: user._id,
    courseId: assignment.courseId,
    status: 'ACTIVE',
    isDeleted: false
  });
  if (!isEnrolled) {
    throw { status: 403, message: 'You are not enrolled in this subject' };
  }

  // 3. Late Check
  const isLate = new Date() > new Date(assignment.dueDate);

  // 4. Create or Update (One submission per student per assignment)
  let submission = await submissionRepository.findSubmission(assignmentId, user._id);

  const payload = {
    ...data,
    isLate,
    status: 'SUBMITTED', // Reset status to submitted if it was graded before and updated
    updatedBy: user._id,
  };

  let action = 'SUBMISSION_UPDATED';

  if (!submission) {
    // Create new
    action = 'SUBMISSION_CREATED';
    submission = await submissionRepository.create({
      assignmentId,
      studentId: user._id,
      submissionText: data.submissionText,
      fileUrl: data.fileUrl,
      isLate,
      status: 'SUBMITTED',
      instituteId: assignment.instituteId,
      branchId: assignment.branchId,
      createdBy: user._id,
    });
  } else {
    // Update existing
    submission = await submissionRepository.updateById(submission._id, payload);
  }

  // 5. Audit Log
  await AuditLogger.log({
    userId: user._id,
    role: user.role,
    action,
    resource: 'Submission',
    resourceId: submission._id,
    metadata: { assignmentId, isLate },
  });

  return submission;
};

// ── Get Submissions for Assignment (Teacher view) ───────────────────────────
const getSubmissionsByAssignment = async (assignmentId, query, user, tenantFilter) => {
  const { page, limit, sortBy, sortOrder, status } = query;

  const assignment = await assignmentRepository.findById(assignmentId);
  if (!assignment || assignment.isDeleted) throw { status: 404, message: 'Assignment not found' };

  if (user.role === ROLES.TEACHER && assignment.teacherId?.toString() !== user._id.toString()) {
    throw { status: 403, message: 'You can only view submissions for your own assignments' };
  }

  const filter = { assignmentId, isDeleted: false, ...tenantFilter };
  if (status) filter.status = status;

  return submissionRepository.findWithPagination(filter, { page, limit, sortBy, sortOrder });
};

// ── Get My Submissions (Student view) ───────────────────────────────────────
const getMySubmissions = async (query, user) => {
  const { page, limit, sortBy, sortOrder, status } = query;
  
  const filter = { studentId: user._id, isDeleted: false };
  if (status) filter.status = status;

  return submissionRepository.findWithPagination(filter, { page, limit, sortBy, sortOrder });
};

// ── Get Student Submissions (Teacher/Admin view) ────────────────────────────
const getStudentSubmissions = async (studentId, query, user, tenantFilter) => {
  const { page, limit, sortBy, sortOrder, status } = query;
  const filter = { studentId, isDeleted: false, ...tenantFilter };
  if (status) filter.status = status;
  // Note: For a teacher, they should strictly only see submissions for their assignments.
  // This is a bit complex to filter without a join, but we can retrieve them and 
  // maybe the UI handles it, or we rely on the tenant filter for now.
  // If user is TEACHER, we can find all their assignments and restrict `assignmentId: { $in: myAssignmentIds }`.
  if (user.role === ROLES.TEACHER) {
    const myAssignments = await assignmentRepository.find({ teacherId: user._id, isDeleted: false });
    const myAssignmentIds = myAssignments.map(a => a._id);
    filter.assignmentId = { $in: myAssignmentIds };
  }

  return submissionRepository.findWithPagination(filter, { page, limit, sortBy, sortOrder });
};

// ── Grade Submission ────────────────────────────────────────────────────────
const gradeSubmission = async (id, data, user, tenantFilter) => {
  const submission = await submissionRepository.findById(id);
  if (!submission || submission.isDeleted) throw { status: 404, message: 'Submission not found' };

  const assignment = await assignmentRepository.findById(submission.assignmentId);
  
  // Validation
  if (user.role === ROLES.TEACHER && assignment.teacherId?.toString() !== user._id.toString()) {
    throw { status: 403, message: 'You can only grade submissions for your own assignments' };
  }

  if (data.marksObtained > assignment.maxMarks) {
    throw { status: 400, message: `Marks cannot exceed maximum marks (${assignment.maxMarks})` };
  }

  const payload = {
    marksObtained: data.marksObtained,
    feedback: data.feedback,
    status: 'GRADED',
    updatedBy: user._id,
  };

  const updated = await submissionRepository.updateById(id, payload);

  await AuditLogger.log({
    userId: user._id,
    role: user.role,
    action: 'SUBMISSION_GRADED',
    resource: 'Submission',
    resourceId: updated._id,
    metadata: { marksObtained: data.marksObtained },
  });

  return updated;
};

// ── Unsubmit Assignment ───────────────────────────────────────────────────────
const unsubmitAssignment = async (id, user) => {
  const submission = await submissionRepository.findById(id);
  if (!submission || submission.isDeleted) throw { status: 404, message: 'Submission not found' };

  if (submission.studentId.toString() !== user._id.toString()) {
    throw { status: 403, message: 'You can only unsubmit your own assignments' };
  }

  const assignment = await assignmentRepository.findById(submission.assignmentId);
  if (!assignment) throw { status: 404, message: 'Assignment not found' };

  if (new Date() > new Date(assignment.dueDate)) {
    throw { status: 400, message: 'Cannot unsubmit after the due date' };
  }

  await submissionRepository.hardDelete(id);

  await AuditLogger.log({
    userId: user._id,
    role: user.role,
    action: 'SUBMISSION_UNSUBMITTED',
    resource: 'Submission',
    resourceId: id,
    metadata: { assignmentId: assignment._id },
  });
};

module.exports = {
  submitAssignment,
  getSubmissionsByAssignment,
  getMySubmissions,
  getStudentSubmissions,
  gradeSubmission,
  unsubmitAssignment,
};
