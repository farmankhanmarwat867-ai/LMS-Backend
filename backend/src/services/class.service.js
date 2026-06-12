const classRepository = require('../repositories/class.repository');
const branchRepository = require('../repositories/branch.repository');
const academicSessionRepository = require('../repositories/academicSession.repository');
const { auditLog } = require('../utils/auditLogger');
const { paginate } = require('../utils/pagination');

/**
 * CLASS SERVICE
 * Business logic for Class Management
 */

// ── Create Class ───────────────────────────────────────────────────────
const createClass = async (data, user, tenantFilter) => {
  // 1. Validate Branch belongs to this tenant
  const branch = await branchRepository.findOne({ _id: data.branchId, instituteId: tenantFilter.instituteId });
  if (!branch) throw { status: 404, message: 'Branch not found or access denied' };

  // 2. Validate Academic Session belongs to this tenant and is ACTIVE/UPCOMING
  const session = await academicSessionRepository.findOne({ _id: data.sessionId, instituteId: tenantFilter.instituteId });
  if (!session) throw { status: 404, message: 'Academic session not found or access denied' };
  if (['COMPLETED', 'CANCELLED'].includes(session.status)) {
    throw { status: 400, message: `Cannot add class to a '${session.status}' session` };
  }

  // 3. Check for duplicates (same code, branch, session)
  const existingCode = await classRepository.findByCode(data.code, data.branchId, data.sessionId);
  if (existingCode) {
    throw {
      status: 409,
      message: `Class code '${data.code.toUpperCase()}' is already in use for this branch and session`,
    };
  }

  // 4. Create class
  const newClass = await classRepository.create({
    name: data.name,
    code: data.code.toUpperCase(),
    instituteId: tenantFilter.instituteId,
    branchId: data.branchId,
    sessionId: data.sessionId,
    status: data.status || 'ACTIVE',
    createdBy: user._id,
  });

  await auditLog({
    userId: user._id,
    role: user.role,
    action: 'CREATE',
    resource: 'Class',
    resourceId: newClass._id,
    metadata: { name: newClass.name, code: newClass.code, branchId: newClass.branchId },
  });

  return newClass;
};

// ── Get All Classes ────────────────────────────────────────────────────
const getAllClasses = async (queryOptions, tenantFilter) => {
  const query = { ...tenantFilter };

  // Optional filters
  if (queryOptions.branchId) query.branchId = queryOptions.branchId;
  if (queryOptions.sessionId) query.sessionId = queryOptions.sessionId;
  if (queryOptions.status) query.status = queryOptions.status;
  if (queryOptions.search) {
    query.$or = [
      { name: { $regex: queryOptions.search, $options: 'i' } },
      { code: { $regex: queryOptions.search, $options: 'i' } },
    ];
  }

  const options = {
    sort: { createdAt: -1 },
    populate: [
      { path: 'sessionId', select: 'name code status' },
      { path: 'branchId', select: 'name code' },
      { path: 'createdBy', select: 'name email' }
    ],
  };

  return paginate(classRepository.model, query, { ...queryOptions, ...options });
};

// ── Get Class by ID ────────────────────────────────────────────────────
const getClassById = async (id, tenantFilter) => {
  const classObj = await classRepository.model.findOne({ _id: id, ...tenantFilter })
    .populate('sessionId', 'name code status')
    .populate('branchId', 'name code')
    .populate('createdBy', 'name email');
    
  if (!classObj) throw { status: 404, message: 'Class not found or access denied' };
  return classObj;
};

// ── Update Class ───────────────────────────────────────────────────────
const updateClass = async (id, data, user, tenantFilter) => {
  const classObj = await classRepository.findOne({ _id: id, ...tenantFilter });
  if (!classObj) throw { status: 404, message: 'Class not found or access denied' };

  // Cannot change the code, branch, or session once set
  if (data.code && data.code.toUpperCase() !== classObj.code) {
    throw { status: 400, message: 'Class code cannot be changed after creation' };
  }
  if (data.branchId && data.branchId !== classObj.branchId.toString()) {
    throw { status: 400, message: 'Class branch cannot be changed after creation' };
  }
  if (data.sessionId && data.sessionId !== classObj.sessionId.toString()) {
    throw { status: 400, message: 'Class session cannot be changed after creation' };
  }

  // Remove immutable fields from update payload
  const { code, branchId, sessionId, instituteId, ...updatePayload } = data;

  const updated = await classRepository.updateById(id, {
    ...updatePayload,
    updatedBy: user._id,
  });

  await auditLog({
    userId: user._id,
    role: user.role,
    action: 'UPDATE',
    resource: 'Class',
    resourceId: id,
    metadata: { changedFields: Object.keys(updatePayload) },
  });

  return updated;
};

// ── Soft Delete Class ──────────────────────────────────────────────────
const deleteClass = async (id, user, tenantFilter) => {
  const classObj = await classRepository.findOne({ _id: id, ...tenantFilter });
  if (!classObj) throw { status: 404, message: 'Class not found or access denied' };

  await classRepository.softDelete(id, user._id);

  await auditLog({
    userId: user._id,
    role: user.role,
    action: 'SOFT_DELETE',
    resource: 'Class',
    resourceId: id,
    metadata: { name: classObj.name },
  });
};

module.exports = {
  createClass,
  getAllClasses,
  getClassById,
  updateClass,
  deleteClass,
};
