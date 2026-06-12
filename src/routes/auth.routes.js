const express = require('express');
const router = express.Router();

const { login, register, getMe, changePassword, logout, refreshToken } = require('../controllers/auth.controller');
const { protect } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/rbac.middleware');
const { validate } = require('../middlewares/validate.middleware');
const {
  loginValidator,
  registerValidator,
  changePasswordValidator,
  refreshTokenValidator,
} = require('../validators/auth.validator');

// ── Public Routes ──────────────────────────────────────────────────────
router.post('/login', loginValidator, validate, login);
router.post('/refresh-token', refreshTokenValidator, validate, refreshToken);

// ── Protected Routes ───────────────────────────────────────────────────
router.use(protect);

router.get('/me', getMe);
router.post('/logout', logout);
router.put('/change-password', changePasswordValidator, validate, changePassword);

// SUPER_ADMIN only
router.post('/register', authorize('SUPER_ADMIN'), registerValidator, validate, register);

module.exports = router;
