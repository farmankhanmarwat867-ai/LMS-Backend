const express = require('express');
const {
  createInstitute,
  getAllInstitutes,
  getInstitute,
  updateInstitute,
  deleteInstitute,
  toggleStatus,
} = require('../controllers/instituteController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);
router.use(authorize('SUPER_ADMIN'));

router.route('/').get(getAllInstitutes).post(createInstitute);
router.route('/:id').get(getInstitute).put(updateInstitute).delete(deleteInstitute);
router.patch('/:id/toggle', toggleStatus);

module.exports = router;
