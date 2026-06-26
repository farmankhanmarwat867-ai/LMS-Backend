const crypto = require('crypto');
const emailService = require('./email.service');
const userRepository = require('../repositories/user.repository');
const authRepository = require('../repositories/auth.repository');
const { generateAccessToken, generateRefreshToken, verifyAccessToken } = require('../utils/generateToken');
const AuditLogger = require('../utils/auditLogger');

const REFRESH_TOKEN_EXPIRY_DAYS = parseInt(process.env.REFRESH_TOKEN_EXPIRE_DAYS) || 30;

/**
 * AUTH SERVICE — All auth business logic lives here
 */

// ── Login ─────────────────────────────────────────────────────────────
const loginUser = async ({ email, password, role, ipAddress, userAgent }) => {
  const user = await userRepository.findByEmail(email, true);
  if (!user) throw { status: 401, message: 'Invalid email or password' };
  
  if (role && user.role !== role) {
    throw { status: 401, message: `Access denied for role: ${role}` };
  }

  if (!user.isActive) throw { status: 403, message: 'Account is deactivated. Contact your administrator.' };

  const isMatch = await user.matchPassword(password);
  if (!isMatch) throw { status: 401, message: 'Invalid email or password' };

  // Generate tokens
  const accessToken = generateAccessToken({
    id: user._id,
    role: user.role,
    instituteId: user.instituteId,
    branchId: user.branchId,
  });

  const rawRefreshToken = generateRefreshToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

  await authRepository.createRefreshToken({
    userId: user._id,
    token: rawRefreshToken,
    expiresAt,
    ipAddress,
    userAgent,
  });

  // Create session log
  await authRepository.createSession({ userId: user._id, ipAddress, userAgent });

  // Audit log
  await AuditLogger.log({ userId: user._id, role: user.role, action: 'LOGIN', resource: 'User', resourceId: user._id, ipAddress });

  return {
    accessToken,
    refreshToken: rawRefreshToken,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      instituteId: user.instituteId,
      branchId: user.branchId,
      avatar: user.avatar,
    },
  };
};

// ── Register ──────────────────────────────────────────────────────────
const registerUser = async (data, createdBy) => {
  const existing = await userRepository.findByEmail(data.email);
  if (existing) throw { status: 409, message: 'Email already exists' };

  const user = await userRepository.create({ ...data, createdBy: createdBy._id });

  await AuditLogger.log({ userId: createdBy._id, role: createdBy.role, action: 'REGISTER', resource: 'User', resourceId: user._id, ipAddress: '' });

  return { id: user._id, name: user.name, email: user.email, role: user.role, instituteId: user.instituteId, branchId: user.branchId };
};

// ── Refresh Token ─────────────────────────────────────────────────────
const refreshAccessToken = async (refreshToken) => {
  const tokenDoc = await authRepository.findRefreshToken(refreshToken);
  if (!tokenDoc) throw { status: 401, message: 'Invalid or expired refresh token' };
  if (tokenDoc.expiresAt < new Date()) {
    await authRepository.revokeRefreshToken(refreshToken);
    throw { status: 401, message: 'Refresh token expired. Please login again.' };
  }

  const user = await userRepository.findById(tokenDoc.userId);
  if (!user || !user.isActive) throw { status: 401, message: 'User not found or deactivated' };

  const accessToken = generateAccessToken({
    id: user._id,
    role: user.role,
    instituteId: user.instituteId,
    branchId: user.branchId,
  });

  await AuditLogger.log({ userId: user._id, role: user.role, action: 'TOKEN_REFRESH', resource: 'User', resourceId: user._id });

  return { accessToken };
};

// ── Logout ────────────────────────────────────────────────────────────
const logoutUser = async (userId, role, refreshToken, ipAddress) => {
  if (refreshToken) await authRepository.revokeRefreshToken(refreshToken);
  await authRepository.closeSession(userId);
  await AuditLogger.log({ userId, role, action: 'LOGOUT', resource: 'User', resourceId: userId, ipAddress });
};

// ── Change Password ───────────────────────────────────────────────────
const changePassword = async (userId, role, currentPassword, newPassword) => {
  const user = await userRepository.findByIdWithPassword(userId);
  if (!user) throw { status: 404, message: 'User not found' };

  const isMatch = await user.matchPassword(currentPassword);
  if (!isMatch) throw { status: 400, message: 'Current password is incorrect' };

  user.password = newPassword;
  await user.save();

  // Revoke all refresh tokens after password change
  await authRepository.revokeAllUserTokens(userId);
  await AuditLogger.log({ userId, role, action: 'PASSWORD_CHANGE', resource: 'User', resourceId: userId });
};

// ── Get Me ────────────────────────────────────────────────────────────
const getMe = async (userId) => {
  const user = await userRepository.model.findById(userId)
    .populate('instituteId', 'name logo')
    .populate('branchId', 'name code');
  if (!user) throw { status: 404, message: 'User not found' };
  return user;
};

// ── Forgot Password ───────────────────────────────────────────────────
const forgotPassword = async (email) => {
  const user = await userRepository.findByEmail(email);
  
  // Prevent account enumeration by returning success early without sending an email
  if (!user) {
    console.log(`[AUTH] Forgot password request for unregistered email: ${email}`);
    return true;
  }

  // Generate random token
  const resetToken = crypto.randomBytes(20).toString('hex');

  // Hash token and set to resetPasswordToken field
  user.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // Set expire (15 minutes from now)
  user.resetPasswordExpire = Date.now() + 15 * 60 * 1000;

  await user.save();

  // Create reset url using FRONTEND_URL or CLIENT_URL configuration
  const frontendUrl = process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:5173';
  const resetUrl = `${frontendUrl}/reset-password/${resetToken}`;

  const message = `
    <p>You are receiving this email because you (or someone else) have requested the reset of a password for your account.</p>
    <p>Please click on the following link, or paste this into your browser to complete the process:</p>
    <p><a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 500;">Reset Password</a></p>
    <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>
  `;

  const emailResult = await emailService.sendEmail(
    user.email,
    'Password Reset Request',
    message
  );

  if (emailResult.status !== 'sent') {
    // Clean up DB tokens if mail failed
    user.resetPasswordToken = null;
    user.resetPasswordExpire = null;
    await user.save();
    throw { status: 500, message: `Email could not be sent: ${emailResult.reason}` };
  }

  return true;
};

// ── Reset Password ────────────────────────────────────────────────────
const resetPassword = async (token, newPassword) => {
  // Hash token
  const resetPasswordToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

  const user = await userRepository.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() },
  });

  if (!user) {
    throw { status: 400, message: 'Invalid or expired password reset token' };
  }

  // Set new password (the user schema pre-save hook will hash it)
  user.password = newPassword;
  user.resetPasswordToken = null;
  user.resetPasswordExpire = null;

  await user.save();

  // Log audit
  await AuditLogger.log({
    userId: user._id,
    role: user.role,
    action: 'PASSWORD_RESET',
    resource: 'User',
    resourceId: user._id,
  });

  return user;
};

module.exports = { 
  loginUser, 
  registerUser, 
  refreshAccessToken, 
  logoutUser, 
  changePassword, 
  getMe,
  forgotPassword,
  resetPassword
};
