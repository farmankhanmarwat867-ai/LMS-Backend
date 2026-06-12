const express = require('express');
const { createUser, getAllUsers, getUserById, updateUser, deleteUser, toggleUserStatus } = require('../controllers/userController');
const { protect } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/rbac.middleware');

const router = express.Router();

router.use(protect);

router.route('/')
  .get(authorize('SUPER_ADMIN', 'INSTITUTE_ADMIN'), getAllUsers)
  .post(authorize('SUPER_ADMIN', 'INSTITUTE_ADMIN'), createUser);

router.route('/:id')
  .get(authorize('SUPER_ADMIN', 'INSTITUTE_ADMIN'), getUserById)
  .put(authorize('SUPER_ADMIN', 'INSTITUTE_ADMIN'), updateUser)
  .delete(authorize('SUPER_ADMIN'), deleteUser);

router.patch('/:id/toggle', authorize('SUPER_ADMIN', 'INSTITUTE_ADMIN'), toggleUserStatus);

module.exports = router;
