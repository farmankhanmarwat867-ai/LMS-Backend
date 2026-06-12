const mongoose = require('mongoose');
const instituteRepository = require('../repositories/institute.repository');
const userRepository = require('../repositories/user.repository');
const planRepository = require('../repositories/plan.repository');
const { auditLog } = require('../utils/auditLogger');
const { paginate } = require('../utils/pagination');

/**
 * INSTITUTE SERVICE — Business logic for Institute Onboarding & Management
 */

// ── Create Institute & Admin ──────────────────────────────────────────
const createInstitute = async (data, user) => {
  // 1. Verify Plan exists
  const plan = await planRepository.findById(data.planId);
  if (!plan) throw { status: 404, message: 'Selected Subscription Plan not found' };

  // 2. Check duplicates
  const existingCode = await instituteRepository.findByCode(data.code);
  if (existingCode) throw { status: 409, message: 'Institute code already in use' };

  const existingEmail = await instituteRepository.findByEmail(data.email);
  if (existingEmail) throw { status: 409, message: 'Institute email already in use' };

  const existingAdminEmail = await userRepository.findByEmail(data.adminEmail);
  if (existingAdminEmail) throw { status: 409, message: 'Admin email already in use by another user' };

  // 3. Database Transaction (Atomic creation of Institute + Admin User)
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Create Institute
    const [institute] = await instituteRepository.model.create(
      [
        {
          name: data.name,
          code: data.code,
          email: data.email,
          phone: data.phone,
          address: data.address,
          planId: data.planId,
          billingDetails: data.billingDetails,
          createdBy: user._id,
        },
      ],
      { session }
    );

    // Create Admin User for this Institute
    const [adminUser] = await userRepository.model.create(
      [
        {
          name: data.adminName,
          email: data.adminEmail,
          password: data.adminPassword,
          role: 'INSTITUTE_ADMIN',
          instituteId: institute._id,
          createdBy: user._id,
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    // Audit Logs
    await auditLog({ userId: user._id, role: user.role, action: 'CREATE', resource: 'Institute', resourceId: institute._id });
    await auditLog({ userId: user._id, role: user.role, action: 'REGISTER', resource: 'User', resourceId: adminUser._id, metadata: { note: 'Auto-created during Institute Onboarding' } });

    return { institute, adminUser: { id: adminUser._id, name: adminUser.name, email: adminUser.email } };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

// ── Get All Institutes ────────────────────────────────────────────────
const getAllInstitutes = async (queryOptions) => {
  const query = {};
  if (queryOptions.status) query.status = queryOptions.status;

  // SUPER_ADMIN gets all. Since this is a SUPER_ADMIN route primarily, we just return paginated results.
  return paginate(instituteRepository.model, query, { ...queryOptions, populate: 'planId' });
};

// ── Get Institute by ID ───────────────────────────────────────────────
const getInstituteById = async (id, user) => {
  // If INSTITUTE_ADMIN, ensure they only fetch their own
  if (user.role === 'INSTITUTE_ADMIN' && user.instituteId.toString() !== id.toString()) {
    throw { status: 403, message: 'You do not have permission to view this institute' };
  }

  const institute = await instituteRepository.findById(id, 'planId');
  if (!institute) throw { status: 404, message: 'Institute not found' };
  return institute;
};

// ── Update Institute ──────────────────────────────────────────────────
const updateInstitute = async (id, data, user) => {
  // Verify ownership if INSTITUTE_ADMIN
  if (user.role === 'INSTITUTE_ADMIN' && user.instituteId.toString() !== id.toString()) {
    throw { status: 403, message: 'You do not have permission to update this institute' };
  }

  const institute = await instituteRepository.findById(id);
  if (!institute) throw { status: 404, message: 'Institute not found' };

  // Status changes are SUPER_ADMIN only
  if (data.status && data.status !== institute.status && user.role !== 'SUPER_ADMIN') {
    throw { status: 403, message: 'Only SUPER_ADMIN can change institute status' };
  }

  // Code cannot be changed
  if (data.code && data.code !== institute.code) {
    throw { status: 400, message: 'Institute code cannot be changed once created' };
  }

  const updated = await instituteRepository.updateById(id, { ...data, updatedBy: user._id });

  await auditLog({
    userId: user._id, role: user.role,
    action: 'UPDATE', resource: 'Institute', resourceId: id,
    metadata: { changed: Object.keys(data) }
  });

  return updated;
};

// ── Delete (Suspend) Institute ────────────────────────────────────────
const deleteInstitute = async (id, user) => {
  // Only SUPER_ADMIN can soft-delete an institute
  const institute = await instituteRepository.findById(id);
  if (!institute) throw { status: 404, message: 'Institute not found' };

  await instituteRepository.softDelete(id, user._id);
  
  // Also suspend all users belonging to this institute
  await userRepository.model.updateMany({ instituteId: id }, { isActive: false, updatedBy: user._id });

  await auditLog({ userId: user._id, role: user.role, action: 'SOFT_DELETE', resource: 'Institute', resourceId: id });
};

module.exports = { createInstitute, getAllInstitutes, getInstituteById, updateInstitute, deleteInstitute };
