const sectionRepository = require('../repositories/section.repository');
const classRepository = require('../repositories/class.repository');
const { auditLog } = require('../utils/auditLogger');
const { paginate } = require('../utils/pagination');

/**
 * SECTION SERVICE
 * Business logic for Section Management
 */

// ── Create Section ───────────────────────────────────────────────────────
const createSection = async (data, user, tenantFilter) => {
  // 1. Validate Class belongs to this tenant and branch
  const classObj = await classRepository.findOne({ _id: data.classId, instituteId: tenantFilter.instituteId, branchId: data.branchId });
  if (!classObj) throw { status: 404, message: 'Class not found or does not belong to this branch' };
  if (classObj.status !== 'ACTIVE') throw { status: 400, message: 'Cannot add a section to an INACTIVE class' };

  // 2. Check for duplicates (same name in the same class)
  const existingName = await sectionRepository.findByNameAndClass(data.name, data.classId);
  if (existingName) {
    throw {
      status: 409,
      message: `Section '${data.name.toUpperCase()}' already exists for this class`,
    };
  }

  // 3. Create section
  const newSection = await sectionRepository.create({
    name: data.name.toUpperCase(),
    instituteId: tenantFilter.instituteId,
    branchId: data.branchId,
    classId: data.classId,
    status: data.status || 'ACTIVE',
    createdBy: user._id,
  });

  await auditLog({
    userId: user._id,
    role: user.role,
    action: 'CREATE',
    resource: 'Section',
    resourceId: newSection._id,
    metadata: { name: newSection.name, classId: newSection.classId },
  });

  return newSection;
};

// ── Get All Sections ────────────────────────────────────────────────────
const getAllSections = async (queryOptions, tenantFilter) => {
  const query = { ...tenantFilter };

  // Optional filters
  if (queryOptions.branchId) query.branchId = queryOptions.branchId;
  if (queryOptions.classId) query.classId = queryOptions.classId;
  if (queryOptions.status) query.status = queryOptions.status;
  if (queryOptions.search) {
    query.name = { $regex: queryOptions.search, $options: 'i' };
  }

  const options = {
    sort: { name: 1 }, // Sort sections alphabetically
    populate: [
      { path: 'classId', select: 'name code' },
      { path: 'branchId', select: 'name code' },
      { path: 'createdBy', select: 'name email' }
    ],
  };

  return paginate(sectionRepository.model, query, { ...queryOptions, ...options });
};

// ── Get Section by ID ──────────────────────────────────────────────────
const getSectionById = async (id, tenantFilter) => {
  const section = await sectionRepository.model.findOne({ _id: id, ...tenantFilter })
    .populate('classId', 'name code')
    .populate('branchId', 'name code')
    .populate('createdBy', 'name email');
    
  if (!section) throw { status: 404, message: 'Section not found or access denied' };
  return section;
};

// ── Update Section ─────────────────────────────────────────────────────
const updateSection = async (id, data, user, tenantFilter) => {
  const section = await sectionRepository.findOne({ _id: id, ...tenantFilter });
  if (!section) throw { status: 404, message: 'Section not found or access denied' };

  // Cannot change class or branch once set
  if (data.classId && data.classId !== section.classId.toString()) {
    throw { status: 400, message: 'Section class cannot be changed after creation' };
  }
  if (data.branchId && data.branchId !== section.branchId.toString()) {
    throw { status: 400, message: 'Section branch cannot be changed after creation' };
  }

  // If renaming, check for duplicates in the same class
  if (data.name && data.name.toUpperCase() !== section.name) {
    const existingName = await sectionRepository.findByNameAndClass(data.name, section.classId);
    if (existingName) {
      throw {
        status: 409,
        message: `Section '${data.name.toUpperCase()}' already exists for this class`,
      };
    }
  }

  const updatePayload = { ...data };
  if (updatePayload.name) updatePayload.name = updatePayload.name.toUpperCase();
  delete updatePayload.classId;
  delete updatePayload.branchId;
  delete updatePayload.instituteId;

  const updated = await sectionRepository.updateById(id, {
    ...updatePayload,
    updatedBy: user._id,
  });

  await auditLog({
    userId: user._id,
    role: user.role,
    action: 'UPDATE',
    resource: 'Section',
    resourceId: id,
    metadata: { changedFields: Object.keys(updatePayload) },
  });

  return updated;
};

// ── Soft Delete Section ────────────────────────────────────────────────
const deleteSection = async (id, user, tenantFilter) => {
  const section = await sectionRepository.findOne({ _id: id, ...tenantFilter });
  if (!section) throw { status: 404, message: 'Section not found or access denied' };

  await sectionRepository.softDelete(id, user._id);

  await auditLog({
    userId: user._id,
    role: user.role,
    action: 'SOFT_DELETE',
    resource: 'Section',
    resourceId: id,
    metadata: { name: section.name },
  });
};

module.exports = {
  createSection,
  getAllSections,
  getSectionById,
  updateSection,
  deleteSection,
};
