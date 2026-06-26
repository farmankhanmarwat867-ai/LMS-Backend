const subjectRepository = require('../repositories/subject.repository');
const branchRepository = require('../repositories/branch.repository');
const { auditLog } = require('../utils/auditLogger');
const { paginate } = require('../utils/pagination');

/**
 * SUBJECT SERVICE
 * Business logic for Subject Management
 */

// ── Create Subject ───────────────────────────────────────────────────────
const createSubject = async (data, user, tenantFilter) => {
  // 1. Validate Branch belongs to this tenant
  const branch = await branchRepository.findOne({ _id: data.branchId, instituteId: tenantFilter.instituteId });
  if (!branch) throw { status: 404, message: 'Branch not found or access denied' };

  // 2. Check for duplicates (same code in the same branch)
  const existingCode = await subjectRepository.findByCodeAndBranch(data.code, data.branchId);
  if (existingCode) {
    throw {
      status: 409,
      message: `Subject code '${data.code.toUpperCase()}' already exists for this branch`,
    };
  }

  // 3. Create subject
  const newSubject = await subjectRepository.create({
    name: data.name,
    code: data.code.toUpperCase(),
    instituteId: tenantFilter.instituteId,
    branchId: data.branchId,
    classId: data.classId || null,
    sectionId: data.sectionId || null,
    teacherId: data.teacherId || null,
    status: data.status || 'ACTIVE',
    createdBy: user._id,
  });

  await auditLog({
    userId: user._id,
    role: user.role,
    action: 'CREATE',
    resource: 'Subject',
    resourceId: newSubject._id,
    metadata: { name: newSubject.name, code: newSubject.code, branchId: newSubject.branchId },
  });

  return newSubject;
};

// ── Get All Subjects ────────────────────────────────────────────────────
const getAllSubjects = async (queryOptions, tenantFilter) => {
  const query = { ...tenantFilter };

  // Optional filters
  if (queryOptions.branchId) query.branchId = queryOptions.branchId;
  if (queryOptions.status) query.status = queryOptions.status;
  if (queryOptions.teacherId) query.teacherId = queryOptions.teacherId;
  if (queryOptions.classId) query.classId = queryOptions.classId;
  if (queryOptions.sectionId) query.sectionId = queryOptions.sectionId;
  if (queryOptions.search) {
    query.$or = [
      { name: { $regex: queryOptions.search, $options: 'i' } },
      { code: { $regex: queryOptions.search, $options: 'i' } },
    ];
  }

  const options = {
    sort: { name: 1 }, // Sort subjects alphabetically
    populate: [
      { path: 'branchId', select: 'name code' },
      { path: 'classId', select: 'name code' },
      { path: 'sectionId', select: 'name classId' },
      { path: 'teacherId', select: 'name email' },
      { path: 'createdBy', select: 'name email' }
    ],
  };

  return paginate(subjectRepository.model, query, { ...queryOptions, ...options });
};

// ── Get Subject by ID ──────────────────────────────────────────────────
const getSubjectById = async (id, tenantFilter) => {
  const subject = await subjectRepository.model.findOne({ _id: id, ...tenantFilter })
    .populate('branchId', 'name code')
    .populate('classId', 'name code')
    .populate('sectionId', 'name classId')
    .populate('teacherId', 'name email')
    .populate('createdBy', 'name email');
    
  if (!subject) throw { status: 404, message: 'Subject not found or access denied' };
  return subject;
};

// ── Update Subject ─────────────────────────────────────────────────────
const updateSubject = async (id, data, user, tenantFilter) => {
  const subject = await subjectRepository.findOne({ _id: id, ...tenantFilter });
  if (!subject) throw { status: 404, message: 'Subject not found or access denied' };

  // Cannot change branch once set
  if (data.branchId && data.branchId !== subject.branchId.toString()) {
    throw { status: 400, message: 'Subject branch cannot be changed after creation' };
  }

  // If renaming code, check for duplicates in the same branch
  if (data.code && data.code.toUpperCase() !== subject.code) {
    const existingCode = await subjectRepository.findByCodeAndBranch(data.code, subject.branchId);
    if (existingCode) {
      throw {
        status: 409,
        message: `Subject code '${data.code.toUpperCase()}' already exists for this branch`,
      };
    }
  }

  const updatePayload = { ...data };
  if (updatePayload.code) updatePayload.code = updatePayload.code.toUpperCase();
  delete updatePayload.branchId;
  delete updatePayload.instituteId;

  if (updatePayload.hasOwnProperty('classId')) {
    updatePayload.classId = updatePayload.classId || null;
  }
  if (updatePayload.hasOwnProperty('sectionId')) {
    updatePayload.sectionId = updatePayload.sectionId || null;
  }
  if (updatePayload.hasOwnProperty('teacherId')) {
    updatePayload.teacherId = updatePayload.teacherId || null;
  }

  const updated = await subjectRepository.updateById(id, {
    ...updatePayload,
    updatedBy: user._id,
  });

  await auditLog({
    userId: user._id,
    role: user.role,
    action: 'UPDATE',
    resource: 'Subject',
    resourceId: id,
    metadata: { changedFields: Object.keys(updatePayload) },
  });

  return await subjectRepository.model.findById(updated._id)
    .populate('branchId', 'name code')
    .populate('classId', 'name code')
    .populate('sectionId', 'name classId')
    .populate('teacherId', 'name email')
    .populate('createdBy', 'name email');
};

// ── Soft Delete Subject ────────────────────────────────────────────────
const deleteSubject = async (id, user, tenantFilter) => {
  const subject = await subjectRepository.findOne({ _id: id, ...tenantFilter });
  if (!subject) throw { status: 404, message: 'Subject not found or access denied' };

  await subjectRepository.softDelete(id, user._id);

  await auditLog({
    userId: user._id,
    role: user.role,
    action: 'SOFT_DELETE',
    resource: 'Subject',
    resourceId: id,
    metadata: { name: subject.name, code: subject.code },
  });
};

module.exports = {
  createSubject,
  getAllSubjects,
  getSubjectById,
  updateSubject,
  deleteSubject,
};
