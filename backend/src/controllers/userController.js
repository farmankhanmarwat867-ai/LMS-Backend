const User = require('../models/User');

// @desc    Create a new user
// @route   POST /api/users
// @access  Private (SUPER_ADMIN, INSTITUTE_ADMIN)
exports.createUser = async (req, res, next) => {
  try {
    const { name, email, password, role, instituteId } = req.body;

    // INSTITUTE_ADMIN can only create TEACHER or STUDENT within their institute
    if (req.user.role === 'INSTITUTE_ADMIN') {
      if (!['TEACHER', 'STUDENT'].includes(role)) {
        return res.status(403).json({ message: 'You can only create TEACHER or STUDENT roles' });
      }
      req.body.instituteId = req.user.instituteId;
    }

    const user = await User.create({
      name, email, password,
      role: role || 'STUDENT',
      instituteId: req.body.instituteId || null,
    });

    res.status(201).json({
      success: true,
      data: { id: user._id, name: user.name, email: user.email, role: user.role, instituteId: user.instituteId },
    });
  } catch (error) { next(error); }
};

// @desc    Get all users
// @route   GET /api/users
// @access  Private (SUPER_ADMIN, INSTITUTE_ADMIN)
exports.getAllUsers = async (req, res, next) => {
  try {
    let query = {};
    if (req.user.role === 'INSTITUTE_ADMIN') {
      query.instituteId = req.user.instituteId;
    }
    const users = await User.find(query).populate('instituteId', 'name').sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: users.length, data: users });
  } catch (error) { next(error); }
};

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private (SUPER_ADMIN, INSTITUTE_ADMIN)
exports.getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).populate('instituteId', 'name');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.status(200).json({ success: true, data: user });
  } catch (error) { next(error); }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private (SUPER_ADMIN, INSTITUTE_ADMIN)
exports.updateUser = async (req, res, next) => {
  try {
    const { password, ...rest } = req.body; // prevent password update here
    const user = await User.findByIdAndUpdate(req.params.id, rest, { new: true, runValidators: true });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.status(200).json({ success: true, data: user });
  } catch (error) { next(error); }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private (SUPER_ADMIN)
exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.status(200).json({ success: true, message: 'User deleted successfully' });
  } catch (error) { next(error); }
};

// @desc    Toggle user active status
// @route   PATCH /api/users/:id/toggle
// @access  Private (SUPER_ADMIN, INSTITUTE_ADMIN)
exports.toggleUserStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    user.isActive = !user.isActive;
    await user.save();
    res.status(200).json({
      success: true,
      message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
      data: user,
    });
  } catch (error) { next(error); }
};
