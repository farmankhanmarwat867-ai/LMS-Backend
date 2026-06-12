const authService = require('../services/auth.service');
const { success, created, error } = require('../utils/apiResponse');

/**
 * Auth Controller — thin HTTP layer, delegates to auth.service
 */

// POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await authService.loginUser({
      email,
      password,
      ipAddress: req.ip || req.headers['x-forwarded-for'] || '',
      userAgent: req.headers['user-agent'] || '',
    });
    return success(res, result, 'Login successful');
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/register  (SUPER_ADMIN only)
const register = async (req, res, next) => {
  try {
    const user = await authService.registerUser(req.body, req.user);
    return created(res, user, 'User registered successfully');
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/me
const getMe = async (req, res, next) => {
  try {
    const user = await authService.getMe(req.user._id);
    return success(res, user, 'Profile fetched successfully');
  } catch (err) {
    next(err);
  }
};

// PUT /api/auth/change-password
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    await authService.changePassword(req.user._id, req.user.role, currentPassword, newPassword);
    return success(res, null, 'Password changed successfully. Please login again.');
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/logout
const logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    await authService.logoutUser(req.user._id, req.user.role, refreshToken, req.ip);
    return success(res, null, 'Logged out successfully');
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/refresh-token
const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken: token } = req.body;
    const result = await authService.refreshAccessToken(token);
    return success(res, result, 'Token refreshed successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = { login, register, getMe, changePassword, logout, refreshToken };
