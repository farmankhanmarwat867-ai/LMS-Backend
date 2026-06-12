const academicSessionRepository = require('../repositories/academicSession.repository');
const instituteRepository = require('../repositories/institute.repository');
const { auditLog } = require('../utils/auditLogger');
const { paginate } = require('../utils/pagination');

/**
 * ACADEMIC SESSION SERVICE
 * All business logic, validations, and rules for Academic Sessions
 */

// ── Create Academic Session ────────────────────────────────────────────
const createSession = async (data, user) => {
  // 1. Verify institute exists
  const institute = await instituteRepository.findById(user.instituteId);
  if (!institute) throw { status: 404, message: 'Institute not found' };

  // 2. endDate must be after startDate
  const startDate = new Date(data.startDate);
  const endDate = new Date(data.endDate);
  if (endDate <= startDate) {
    throw { status: 400, message: 'End date must be after start date' };
  }

  // 3. Check for duplicate code within this institute
  const existingCode = await academicSessionRepository.findByCode(data.code, user.instituteId);
  if (existingCode) {
    throw {
      status: 409,
      message: `Session code '${data.code.toUpperCase()}' is already in use for this institute`,
    };
  }

  // 4. Check for date range overlap with existing UPCOMING / ACTIVE sessions
  const overlapping = await academicSessionRepository.findOverlapping(
    user.instituteId,
    startDate,
    endDate
  );
  if (overlapping.length > 0) {
    throw {
      status: 409,
      message: `Date range overlaps with an existing session: '${overlapping[0].name}'`,
    };
  }

  // 5. Create session
  const session = await academicSessionRepository.create({
    name: data.name,
    code: data.code.toUpperCase(),
    startDate,
    endDate,
    description: data.description || '',
    status: data.status || 'UPCOMING',
    instituteId: user.instituteId,
    createdBy: user._id,
  });

  await auditLog({
    userId: user._id,
    role: user.role,
    action: 'CREATE',
    resource: 'AcademicSession',
    resourceId: session._id,
    metadata: { name: session.name, code: session.code },
  });

  return session;
};

// ── Get All Sessions ───────────────────────────────────────────────────
const getAllSessions = async (queryOptions, tenantFilter) => {
  const query = { ...tenantFilter };

  // Optional filters
  if (queryOptions.status) query.status = queryOptions.status;
  if (queryOptions.search) {
    query.$or = [
      { name: { $regex: queryOptions.search, $options: 'i' } },
      { code: { $regex: queryOptions.search, $options: 'i' } },
    ];
  }

  const options = {
    sort: { startDate: -1 },
    populate: [{ path: 'createdBy', select: 'name email role' }, { path: 'updatedBy', select: 'name email' }],
  };

  return paginate(academicSessionRepository.model, query, { ...queryOptions, ...options });
};

// ── Get Session by ID ──────────────────────────────────────────────────
const getSessionById = async (id, tenantFilter) => {
  const session = await academicSessionRepository.findOne(
    { _id: id, ...tenantFilter },
    'createdBy updatedBy'
  );
  if (!session) throw { status: 404, message: 'Academic session not found or access denied' };
  return session;
};

// ── Update Session ─────────────────────────────────────────────────────
const updateSession = async (id, data, user, tenantFilter) => {
  const session = await academicSessionRepository.findOne({ _id: id, ...tenantFilter });
  if (!session) throw { status: 404, message: 'Academic session not found or access denied' };

  // Cannot update a COMPLETED or CANCELLED session
  if (['COMPLETED', 'CANCELLED'].includes(session.status)) {
    throw {
      status: 400,
      message: `Cannot update a session with status '${session.status}'`,
    };
  }

  // Cannot change the code once set
  if (data.code && data.code.toUpperCase() !== session.code) {
    throw { status: 400, message: 'Session code cannot be changed after creation' };
  }

  // Validate date range if either is being updated
  const startDate = data.startDate ? new Date(data.startDate) : session.startDate;
  const endDate   = data.endDate   ? new Date(data.endDate)   : session.endDate;

  if (endDate <= startDate) {
    throw { status: 400, message: 'End date must be after start date' };
  }

  // Overlap check (exclude self)
  if (data.startDate || data.endDate) {
    const overlapping = await academicSessionRepository.findOverlapping(
      session.instituteId,
      startDate,
      endDate,
      id
    );
    if (overlapping.length > 0) {
      throw {
        status: 409,
        message: `Date range overlaps with existing session: '${overlapping[0].name}'`,
      };
    }
  }

  // Remove code from update payload (immutable)
  const { code, ...updatePayload } = data;

  const updated = await academicSessionRepository.updateById(id, {
    ...updatePayload,
    startDate,
    endDate,
    updatedBy: user._id,
  });

  await auditLog({
    userId: user._id,
    role: user.role,
    action: 'UPDATE',
    resource: 'AcademicSession',
    resourceId: id,
    metadata: { changedFields: Object.keys(updatePayload) },
  });

  return updated;
};

// ── Change Session Status ──────────────────────────────────────────────
const changeSessionStatus = async (id, newStatus, user, tenantFilter) => {
  const session = await academicSessionRepository.findOne({ _id: id, ...tenantFilter });
  if (!session) throw { status: 404, message: 'Academic session not found or access denied' };

  // Status transition rules
  const validTransitions = {
    UPCOMING:  ['ACTIVE', 'CANCELLED'],
    ACTIVE:    ['COMPLETED', 'CANCELLED'],
    COMPLETED: [],
    CANCELLED: [],
  };

  if (!validTransitions[session.status].includes(newStatus)) {
    throw {
      status: 400,
      message: `Cannot transition from '${session.status}' to '${newStatus}'. Allowed: [${validTransitions[session.status].join(', ') || 'none'}]`,
    };
  }

  // Enforce single ACTIVE session per institute
  if (newStatus === 'ACTIVE') {
    const currentActive = await academicSessionRepository.findActiveSession(session.instituteId);
    if (currentActive && currentActive._id.toString() !== id) {
      throw {
        status: 409,
        message: `Session '${currentActive.name}' is already ACTIVE. Complete or cancel it first.`,
      };
    }
  }

  const updated = await academicSessionRepository.updateById(id, {
    status: newStatus,
    updatedBy: user._id,
  });

  await auditLog({
    userId: user._id,
    role: user.role,
    action: 'STATUS_CHANGE',
    resource: 'AcademicSession',
    resourceId: id,
    metadata: { from: session.status, to: newStatus },
  });

  return updated;
};

// ── Soft Delete Session ────────────────────────────────────────────────
const deleteSession = async (id, user, tenantFilter) => {
  const session = await academicSessionRepository.findOne({ _id: id, ...tenantFilter });
  if (!session) throw { status: 404, message: 'Academic session not found or access denied' };

  // Cannot delete an ACTIVE session
  if (session.status === 'ACTIVE') {
    throw {
      status: 400,
      message: 'Cannot delete an ACTIVE session. Change its status to COMPLETED or CANCELLED first.',
    };
  }

  await academicSessionRepository.softDelete(id, user._id);

  await auditLog({
    userId: user._id,
    role: user.role,
    action: 'SOFT_DELETE',
    resource: 'AcademicSession',
    resourceId: id,
    metadata: { name: session.name },
  });
};

// ── Get Active Session ─────────────────────────────────────────────────
const getActiveSession = async (tenantFilter) => {
  if (!tenantFilter.instituteId) {
    throw { status: 400, message: 'Institute context required' };
  }
  const session = await academicSessionRepository.findActiveSession(tenantFilter.instituteId);
  if (!session) throw { status: 404, message: 'No active academic session found for this institute' };
  return session;
};

module.exports = {
  createSession,
  getAllSessions,
  getSessionById,
  updateSession,
  changeSessionStatus,
  deleteSession,
  getActiveSession,
};
