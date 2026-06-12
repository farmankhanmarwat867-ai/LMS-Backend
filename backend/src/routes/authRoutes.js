const express = require('express');
const { login, register, getMe, changePassword } = require('../controllers/authController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/login', login);
router.post('/register', protect, authorize('SUPER_ADMIN'), register);
router.get('/me', protect, getMe);
router.put('/change-password', protect, changePassword);

module.exports = router;
