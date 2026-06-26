const BaseRepository = require('./base.repository');
const User = require('../models/User');

/**
 * User Repository — Data access layer for User Management (Phase 8)
 * Extends BaseRepository with user-specific queries
 */
class UserRepository extends BaseRepository {
  constructor() {
    super(User);
  }

  // ── Auth helpers ─────────────────────────────────────────────────────
  async findByEmail(email, includePassword = false) {
    const query = User.findOne({ email });
    if (includePassword) query.select('+password');
    return query;
  }

  async findByIdWithPassword(id) {
    return User.findById(id).select('+password');
  }

  // ── Role-based queries ────────────────────────────────────────────────
  async findByRole(role, filters = {}) {
    return User.find({ role, ...filters }).sort({ createdAt: -1 });
  }

  // ── Tenant-scoped queries ─────────────────────────────────────────────
  async findByInstituteId(instituteId, role = null) {
    const query = { instituteId };
    if (role) query.role = role;
    return User.find(query).sort({ createdAt: -1 });
  }

  async findByBranchId(branchId, role = null) {
    const query = { branchId };
    if (role) query.role = role;
    return User.find(query).sort({ createdAt: -1 });
  }

  // ── Count helpers for plan limit enforcement ──────────────────────────
  async countByInstituteAndRole(instituteId, role) {
    return User.countDocuments({ instituteId, role, isDeleted: false });
  }

  async countByBranchAndRole(branchId, role) {
    return User.countDocuments({ branchId, role, isDeleted: false });
  }

  // ── Search with tenant filter ─────────────────────────────────────────
  async searchUsers(tenantFilter, filters = {}, options = {}) {
    const query = { ...tenantFilter };

    if (filters.role)     query.role     = filters.role;
    if (filters.isActive !== undefined) query.isActive = filters.isActive;
    if (filters.branchId) query.branchId = filters.branchId;
    if (filters.classId)  query.classId  = filters.classId;
    if (filters.search) {
      query.$or = [
        { name:  { $regex: filters.search, $options: 'i' } },
        { email: { $regex: filters.search, $options: 'i' } },
      ];
    }

    const page  = parseInt(options.page)  || 1;
    const limit = parseInt(options.limit) || 10;
    const skip  = (page - 1) * limit;

    const [data, total] = await Promise.all([
      User.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('instituteId', 'name logo')
        .populate('branchId',    'name code')
        .populate('classId',     'name code')
        .populate('sectionId',   'name')
        .populate('createdBy',   'name email'),
      User.countDocuments(query),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        pages:   Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    };
  }

  // ── Parent-student relationship ───────────────────────────────────────
  async findStudentsByParentId(parentId) {
    const parent = await User.findById(parentId).populate({
      path:     'parentOf',
      select:   'name email phone avatar role branchId instituteId isActive',
      populate: [
        { path: 'branchId',    select: 'name code' },
        { path: 'instituteId', select: 'name'      },
      ],
    });
    return parent ? parent.parentOf : [];
  }

  async addChildToParent(parentId, studentId, updatedBy) {
    return User.findByIdAndUpdate(
      parentId,
      { $addToSet: { parentOf: studentId }, updatedBy },
      { new: true }
    );
  }

  async removeChildFromParent(parentId, studentId, updatedBy) {
    return User.findByIdAndUpdate(
      parentId,
      { $pull: { parentOf: studentId }, updatedBy },
      { new: true }
    );
  }

  // ── Status toggle ─────────────────────────────────────────────────────
  async setStatus(id, isActive, updatedBy) {
    return User.findByIdAndUpdate(
      id,
      { isActive, updatedBy },
      { new: true }
    );
  }
}

module.exports = new UserRepository();
