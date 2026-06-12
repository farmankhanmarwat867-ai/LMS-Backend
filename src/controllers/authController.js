const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const bcrypt = require('bcryptjs');

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide an email and password' });
    }
    const user = await User.findOne({ email }).select('+password');
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const isMatch = await user.matchPassword(password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

    if (!user.isActive) return res.status(403).json({ message: 'Account is deactivated' });

    const token = generateToken(user._id, user.role);
    res.status(200).json({
      success: true,
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, instituteId: user.instituteId },
    });
  } catch (error) { next(error); }
};

// @desc    Register a new user (SUPER_ADMIN only)
// @route   POST /api/auth/register
// @access  Private (SUPER_ADMIN)
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role, instituteId } = req.body;
    const user = await User.create({ name, email, password, role: role || 'STUDENT', instituteId: instituteId || null });
    res.status(201).json({
      success: true,
      data: { id: user._id, name: user.name, email: user.email, role: user.role, instituteId: user.instituteId },
    });
  } catch (error) { next(error); }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    res.status(200).json({ success: true, data: user });
  } catch (error) { next(error); }
};

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id).select('+password');

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) return res.status(400).json({ message: 'Current password is incorrect' });

    user.password = newPassword;
    await user.save();

    res.status(200).json({ success: true, message: 'Password changed successfully' });
  } catch (error) { next(error); }
};
