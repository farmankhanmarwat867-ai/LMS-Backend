const userRepository      = require('../repositories/user.repository');
const instituteRepository = require('../repositories/institute.repository');
const branchRepository    = require('../repositories/branch.repository');
const planRepository      = require('../repositories/plan.repository');
const { auditLog }        = require('../utils/auditLogger');
const { ROLES }           = require('../constants/roles');

/**
 * USER SERVICE — Phase 8
 * Full business logic for multi-tenant User Management
 *
 * Role creation rules:
 *  SUPER_ADMIN     → can create INSTITUTE_ADMIN (no instituteId/branchId required)
 *  INSTITUTE_ADMIN → can create BRANCH_ADMIN, TEACHER, STUDENT, PARENT (same institute)
 *  BRANCH_ADMIN    → can create TEACHER, STUDENT, PARENT (same branch)
 */

// ─── Helpers ──────────────────────────────────────────────────────────────────

const generateNextStudentId = async () => {
  const currentYear = new Date().getFullYear();
  const prefix = `STD-${currentYear}-`;
  
  // Find the highest studentId for the current year
  const lastStudent = await userRepository.model.findOne({
    studentId: new RegExp(`^${prefix}`)
  }).sort({ studentId: -1 });

  let sequence = 1;
  if (lastStudent && lastStudent.studentId) {
    const lastSequence = parseInt(lastStudent.studentId.split('-')[2], 10);
    if (!isNaN(lastSequence)) {
      sequence = lastSequence + 1;
    }
  }

  const paddedSequence = sequence.toString().padStart(6, '0');
  return `${prefix}${paddedSequence}`;
};

/**
 * Enforce role-creation permissions based on the creator's role.
 * Returns { instituteId, branchId } to stamp on the new user.
 */
const resolveCreationScope = async (creatorUser, targetRole, bodyInstituteId, bodyBranchId) => {
  const { role, instituteId: creatorInstituteId, branchId: creatorBranchId } = creatorUser;

  // ── SUPER_ADMIN ───────────────────────────────────────────────────────
  if (role === ROLES.SUPER_ADMIN) {
    // SUPER_ADMIN can only create INSTITUTE_ADMIN via this endpoint
    if (targetRole !== ROLES.INSTITUTE_ADMIN) {
      throw {
        status: 403,
        message: 'SUPER_ADMIN can only create INSTITUTE_ADMIN users via this endpoint',
      };
    }
    // instituteId optional for INSTITUTE_ADMIN (can be set later or via institute creation)
    return { instituteId: bodyInstituteId || null, branchId: null };
  }

  // ── INSTITUTE_ADMIN ───────────────────────────────────────────────────
  if (role === ROLES.INSTITUTE_ADMIN) {
    const allowedRoles = [ROLES.BRANCH_ADMIN, ROLES.TEACHER, ROLES.STUDENT, ROLES.PARENT];
    if (!allowedRoles.includes(targetRole)) {
      throw {
        status: 403,
        message: `INSTITUTE_ADMIN can only create: ${allowedRoles.join(', ')}`,
      };
    }

    // BRANCH_ADMIN, TEACHER, STUDENT, PARENT need a branchId
    const branchId = bodyBranchId || null;

    if ([ROLES.BRANCH_ADMIN, ROLES.TEACHER, ROLES.STUDENT, ROLES.PARENT].includes(targetRole)) {
      if (!branchId) {
        throw { status: 400, message: 'branchId is required when creating this role' };
      }
      // Verify branch belongs to this institute
      const branch = await branchRepository.findOne({
        _id: branchId,
        instituteId: creatorInstituteId,
      });
      if (!branch) throw { status: 404, message: 'Branch not found or does not belong to your institute' };
    }

    return { instituteId: creatorInstituteId, branchId };
  }

  // ── BRANCH_ADMIN ──────────────────────────────────────────────────────
  if (role === ROLES.BRANCH_ADMIN) {
    const allowedRoles = [ROLES.TEACHER, ROLES.STUDENT, ROLES.PARENT];
    if (!allowedRoles.includes(targetRole)) {
      throw {
        status: 403,
        message: `BRANCH_ADMIN can only create: ${allowedRoles.join(', ')}`,
      };
    }
    return { instituteId: creatorInstituteId, branchId: creatorBranchId };
  }

  throw { status: 403, message: 'You are not authorized to create users' };
};

/**
 * Enforce subscription plan limits (student / teacher caps)
 */
const enforcePlanLimits = async (instituteId, targetRole) => {
  if (!instituteId) return; // INSTITUTE_ADMIN with no institute yet — skip

  const institute = await instituteRepository.findById(instituteId);
  if (!institute) throw { status: 404, message: 'Institute not found' };

  const plan = await planRepository.findById(institute.planId);
  if (!plan) return; // no plan attached yet — skip enforcement

  if (targetRole === ROLES.STUDENT) {
    const count = await userRepository.countByInstituteAndRole(instituteId, ROLES.STUDENT);
    if (count >= plan.studentLimit) {
      throw {
        status: 403,
        message: `Student limit reached. Your plan allows up to ${plan.studentLimit} students.`,
      };
    }
  }

  if (targetRole === ROLES.TEACHER) {
    const count = await userRepository.countByInstituteAndRole(instituteId, ROLES.TEACHER);
    if (count >= plan.teacherLimit) {
      throw {
        status: 403,
        message: `Teacher limit reached. Your plan allows up to ${plan.teacherLimit} teachers.`,
      };
    }
  }
};

// ─── Create User ──────────────────────────────────────────────────────────────
const createUser = async (data, creatorUser) => {
  // 1. Resolve tenant scope & validate permissions
  const { instituteId, branchId } = await resolveCreationScope(
    creatorUser,
    data.role,
    data.instituteId,
    data.branchId
  );

  // 2. Check plan limits
  await enforcePlanLimits(instituteId, data.role);

  // 3. Email uniqueness check
  const existing = await userRepository.findByEmail(data.email);
  if (existing) throw { status: 409, message: 'A user with this email already exists' };

  // 4. Generate Student ID if role is STUDENT
  let studentId = undefined;
  let qrCodeValue = undefined;
  let rollNumber = data.rollNumber || undefined;

  if (data.role === ROLES.STUDENT) {
    studentId = await generateNextStudentId();
    qrCodeValue = studentId; // Permanent QR code
  }

  // 5. Create user
  const user = await userRepository.create({
    name:        data.name,
    email:       data.email,
    password:    data.password,
    role:        data.role,
    phone:       data.phone       || '',
    avatar:      data.avatar      || '',
    instituteId: instituteId,
    branchId:    branchId,
    classId:     data.role === ROLES.STUDENT ? (data.classId || null) : null,
    sectionId:   data.role === ROLES.STUDENT ? (data.sectionId || null) : null,
    studentId:   studentId,
    qrCodeValue: qrCodeValue,
    rollNumber:  rollNumber,
    parentOf:    data.role === ROLES.PARENT ? (data.parentOf || []) : [],
    createdBy:   creatorUser._id,
    updatedBy:   creatorUser._id,
  });

  // 6. Audit log
  await auditLog({
    userId:     creatorUser._id,
    role:       creatorUser.role,
    action:     'CREATE',
    resource:   'User',
    resourceId: user._id,
    metadata:   { newUserRole: user.role, email: user.email },
  });

  // Return user without password
  const result = user.toObject();
  delete result.password;
  return result;
};

// ─── Get All Users ────────────────────────────────────────────────────────────
const getAllUsers = async (queryOptions, tenantFilter) => {
  return userRepository.searchUsers(tenantFilter, queryOptions, queryOptions);
};

// ─── Get User By ID ───────────────────────────────────────────────────────────
const getUserById = async (id, tenantFilter, requesterId) => {
  const isSelfRequest = id.toString() === requesterId?.toString();
  const query = isSelfRequest ? { _id: id } : { _id: id, ...tenantFilter };
  const user  = await userRepository.findOne(query, 'instituteId branchId classId sectionId createdBy');

  if (!user) throw { status: 404, message: 'User not found or access denied' };
  return user;
};

// ─── Update User ──────────────────────────────────────────────────────────────
const updateUser = async (id, data, updaterUser, tenantFilter) => {
  // Verify the target user is in this tenant's scope (unless they are updating themselves)
  const isSelfUpdate = id.toString() === updaterUser._id.toString();
  const query = isSelfUpdate ? { _id: id } : { _id: id, ...tenantFilter };
  
  const existing = await userRepository.findOne(query);
  if (!existing) throw { status: 404, message: 'User not found or access denied' };

  // If email is being updated, verify it is unique
  if (data.email && data.email !== existing.email) {
    const emailExists = await userRepository.findOne({ email: data.email });
    if (emailExists) throw { status: 409, message: 'Email address is already in use' };
  }

  // If branchId is being changed, verify new branch belongs to same institute
  if (data.branchId && existing.instituteId) {
    const branch = await branchRepository.findOne({
      _id:         data.branchId,
      instituteId: existing.instituteId,
    });
    if (!branch) throw { status: 404, message: 'Branch not found or does not belong to this institute' };
  }

  const updatePayload = { ...data };
  if (updatePayload.hasOwnProperty('classId')) {
    updatePayload.classId = updatePayload.classId || null;
  }
  if (updatePayload.hasOwnProperty('sectionId')) {
    updatePayload.sectionId = updatePayload.sectionId || null;
  }

  const updated = await userRepository.updateById(id, {
    ...updatePayload,
    updatedBy: updaterUser._id,
  });

  await auditLog({
    userId:     updaterUser._id,
    role:       updaterUser.role,
    action:     'UPDATE',
    resource:   'User',
    resourceId: id,
    metadata:   { changed: Object.keys(data) },
  });

  return updated;
};

// ─── Change User Status ───────────────────────────────────────────────────────
const changeUserStatus = async (id, isActive, updaterUser, tenantFilter) => {
  // Prevent self-deactivation
  if (id.toString() === updaterUser._id.toString()) {
    throw { status: 400, message: 'You cannot change your own account status' };
  }

  const existing = await userRepository.findOne({ _id: id, ...tenantFilter });
  if (!existing) throw { status: 404, message: 'User not found or access denied' };

  // BRANCH_ADMIN cannot deactivate higher-level roles
  if (updaterUser.role === ROLES.BRANCH_ADMIN) {
    const protectedRoles = [ROLES.SUPER_ADMIN, ROLES.INSTITUTE_ADMIN];
    if (protectedRoles.includes(existing.role)) {
      throw { status: 403, message: 'You cannot change the status of this role' };
    }
  }

  const updated = await userRepository.setStatus(id, isActive, updaterUser._id);

  await auditLog({
    userId:     updaterUser._id,
    role:       updaterUser.role,
    action:     isActive ? 'ACTIVATE' : 'DEACTIVATE',
    resource:   'User',
    resourceId: id,
  });

  return updated;
};

// ─── Soft Delete User ─────────────────────────────────────────────────────────
const deleteUser = async (id, deleterUser, tenantFilter) => {
  if (id.toString() === deleterUser._id.toString()) {
    throw { status: 400, message: 'You cannot delete your own account' };
  }

  const existing = await userRepository.findOne({ _id: id, ...tenantFilter });
  if (!existing) throw { status: 404, message: 'User not found or access denied' };

  // Only SUPER_ADMIN, INSTITUTE_ADMIN, & BRANCH_ADMIN can delete
  if (existing.role === ROLES.SUPER_ADMIN) {
    throw { status: 403, message: 'SUPER_ADMIN accounts cannot be deleted' };
  }

  if (deleterUser.role === ROLES.BRANCH_ADMIN) {
    const protectedRoles = [ROLES.SUPER_ADMIN, ROLES.INSTITUTE_ADMIN, ROLES.BRANCH_ADMIN];
    if (protectedRoles.includes(existing.role)) {
      throw { status: 403, message: 'You cannot delete this role' };
    }
  }

  await userRepository.softDelete(id, deleterUser._id);
  
  // Release user email unique index constraint
  await userRepository.model.findByIdAndUpdate(id, {
    email: `${existing.email}-deleted-${Date.now()}`
  });

  await auditLog({
    userId:     deleterUser._id,
    role:       deleterUser.role,
    action:     'SOFT_DELETE',
    resource:   'User',
    resourceId: id,
    metadata:   { deletedUserRole: existing.role },
  });
};

// ─── Get Children of a Parent ─────────────────────────────────────────────────
const getChildrenOfParent = async (parentId, tenantFilter) => {
  const parent = await userRepository.findOne({ _id: parentId, role: ROLES.PARENT, ...tenantFilter });
  if (!parent) throw { status: 404, message: 'Parent user not found or access denied' };

  return userRepository.findStudentsByParentId(parentId);
};

// ─── Link Student to Parent ───────────────────────────────────────────────────
const linkStudentToParent = async (parentId, studentId, updaterUser, tenantFilter) => {
  const parent = await userRepository.findOne({ _id: parentId, role: ROLES.PARENT, ...tenantFilter });
  if (!parent) throw { status: 404, message: 'Parent not found or access denied' };

  const student = await userRepository.findOne({ _id: studentId, role: ROLES.STUDENT, ...tenantFilter });
  if (!student) throw { status: 404, message: 'Student not found or access denied' };

  // Prevent duplicate link
  if (parent.parentOf?.map(id => id.toString()).includes(studentId.toString())) {
    throw { status: 409, message: 'Student is already linked to this parent' };
  }

  const updated = await userRepository.addChildToParent(parentId, studentId, updaterUser._id);

  await auditLog({
    userId:     updaterUser._id,
    role:       updaterUser.role,
    action:     'LINK_STUDENT',
    resource:   'User',
    resourceId: parentId,
    metadata:   { studentId },
  });

  return updated;
};

// ─── Unlink Student from Parent ───────────────────────────────────────────────
const unlinkStudentFromParent = async (parentId, studentId, updaterUser, tenantFilter) => {
  const parent = await userRepository.findOne({ _id: parentId, role: ROLES.PARENT, ...tenantFilter });
  if (!parent) throw { status: 404, message: 'Parent not found or access denied' };

  const updated = await userRepository.removeChildFromParent(parentId, studentId, updaterUser._id);

  await auditLog({
    userId:     updaterUser._id,
    role:       updaterUser.role,
    action:     'UNLINK_STUDENT',
    resource:   'User',
    resourceId: parentId,
    metadata:   { studentId },
  });

  return updated;
};

module.exports = {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  changeUserStatus,
  deleteUser,
  getChildrenOfParent,
  linkStudentToParent,
  unlinkStudentFromParent,
  bulkImportStudents,
};

// ─── Bulk Import Students ─────────────────────────────────────────────────────
async function bulkImportStudents(rows, creatorUser) {
  const { instituteId } = creatorUser;

  // Enforce plan limits once upfront (approx check)
  await enforcePlanLimits(instituteId, ROLES.STUDENT);

  const results = { created: [], failed: [] };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // header = row 1

    try {
      // Basic field validation
      if (!row.name || !row.email) {
        results.failed.push({ row: rowNum, email: row.email || '(empty)', reason: 'name and email are required' });
        continue;
      }

      // Check email uniqueness
      const existing = await userRepository.findByEmail(row.email.trim().toLowerCase());
      if (existing) {
        results.failed.push({ row: rowNum, email: row.email, reason: 'Email already exists' });
        continue;
      }

      // Resolve branchId
      if (!row.branchId) {
        results.failed.push({ row: rowNum, email: row.email, reason: 'branchId is required' });
        continue;
      }
      const branch = await branchRepository.findOne({ _id: row.branchId, instituteId });
      if (!branch) {
        results.failed.push({ row: rowNum, email: row.email, reason: 'Branch not found or does not belong to this institute' });
        continue;
      }

      const studentId = await generateNextStudentId();

      const user = await userRepository.create({
        name:        row.name.trim(),
        email:       row.email.trim().toLowerCase(),
        password:    row.password || 'Edu123456',
        role:        ROLES.STUDENT,
        phone:       row.phone        || '',
        avatar:      '',
        instituteId: instituteId,
        branchId:    row.branchId,
        classId:     row.classId      || null,
        sectionId:   row.sectionId    || null,
        studentId:   studentId,
        qrCodeValue: studentId,
        rollNumber:  row.rollNumber   || undefined,
        parentOf:    [],
        createdBy:   creatorUser._id,
        updatedBy:   creatorUser._id,
      });

      results.created.push({ row: rowNum, email: user.email, name: user.name });

      await auditLog({
        userId:     creatorUser._id,
        role:       creatorUser.role,
        action:     'BULK_CREATE',
        resource:   'User',
        resourceId: user._id,
        metadata:   { email: user.email },
      });
    } catch (err) {
      results.failed.push({ row: rowNum, email: row.email || '(error)', reason: err.message || 'Unknown error' });
    }
  }

  return results;
}
