const express = require('express');
const router = express.Router();
const fileController = require('../controllers/file.controller');
const upload = require('../middlewares/upload.middleware');
const { protect } = require('../middlewares/auth.middleware');

// All file endpoints require authentication
router.use(protect);

// ── Upload Endpoints ──────────────────────────────────────────────────────────
// 'file' must match the form-data field name
router.post('/upload', upload.single('file'), fileController.uploadFile);
router.post('/upload-multiple', upload.array('files', 10), fileController.uploadMultipleFiles);

// ── File Management Endpoints ─────────────────────────────────────────────────
router.get('/', fileController.listFiles);
router.get('/:id', fileController.getFileById);
router.delete('/:id', fileController.deleteFile);

// ── Download Endpoint ─────────────────────────────────────────────────────────
router.get('/download/:id', fileController.downloadFile);

module.exports = router;
