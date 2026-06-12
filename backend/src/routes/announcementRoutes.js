const express = require('express');
const { createAnnouncement, getAnnouncements, deleteAnnouncement } = require('../controllers/announcementController');
const { protect } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/rbac.middleware');

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getAnnouncements)
  .post(authorize('INSTITUTE_ADMIN', 'TEACHER', 'SUPER_ADMIN'), createAnnouncement);

router.delete('/:id', authorize('INSTITUTE_ADMIN', 'TEACHER', 'SUPER_ADMIN'), deleteAnnouncement);

module.exports = router;
