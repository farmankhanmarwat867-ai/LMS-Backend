const express = require('express');
const router = express.Router();
const certificateController = require('../controllers/certificate.controller');
const { protect } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/rbac.middleware');

// ── GET /api/certificates/:id ─────────────────────────────────────────────────
// Public endpoint (can be accessed by anyone with the QR/link or by users)
// For security, we might want to keep it open or just rely on the complex ID/Certificate Number.
// We'll leave it without auth middleware so QR code verifications work publicly.
router.get('/:id', certificateController.getCertificateById);

// ── POST /api/certificates/generate ───────────────────────────────────────────
// Only Admins and Teachers can generate certificates
router.post(
  '/generate',
  protect,
  authorize('SUPER_ADMIN', 'INSTITUTE_ADMIN', 'BRANCH_ADMIN', 'TEACHER'),
  certificateController.generateCertificate
);

module.exports = router;
