const fileService = require('../services/file.service');
const apiResponse = require('../utils/apiResponse');

class FileController {
  /**
   * POST /api/files/upload
   * Handle single file upload.
   */
  uploadFile = async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded' });
      }

      const fileRecord = await fileService.uploadFile(req.file, req.body, req.user);
      return apiResponse.created(res, fileRecord, 'File uploaded successfully');
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /api/files/upload-multiple
   * Handle multiple file uploads.
   */
  uploadMultipleFiles = async (req, res, next) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ success: false, message: 'No files uploaded' });
      }

      const fileRecords = await fileService.uploadMultipleFiles(req.files, req.body, req.user);
      return apiResponse.created(res, fileRecords, 'Files uploaded successfully');
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /api/files
   * List files with pagination and filtering.
   */
  listFiles = async (req, res, next) => {
    try {
      // Add institute context to query filters
      const filters = { ...req.query, instituteId: req.user.instituteId };
      const pagination = { page: req.query.page, limit: req.query.limit };

      const result = await fileService.listFiles(filters, pagination);
      return apiResponse.success(res, result.data, 'Files retrieved successfully', 200, result.pagination);
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /api/files/:id
   * Get file metadata.
   */
  getFileById = async (req, res, next) => {
    try {
      const file = await fileService.getFileById(req.params.id, req.user.instituteId);
      return apiResponse.success(res, file, 'File details retrieved');
    } catch (err) {
      next(err);
    }
  };

  /**
   * DELETE /api/files/:id
   * Soft delete a file.
   */
  deleteFile = async (req, res, next) => {
    try {
      const result = await fileService.deleteFile(req.params.id, req.user);
      return apiResponse.success(res, result, 'File deleted successfully');
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /api/files/download/:id
   * Stream file for download.
   */
  downloadFile = async (req, res, next) => {
    try {
      const file = await fileService.getFilePathForDownload(req.params.id, req.user.instituteId);
      
      const fs = require('fs');
      const path = require('path');
      
      // Determine if file is locally stored
      if (file.fileUrl && (file.fileUrl.startsWith('/') || file.fileUrl.includes('localhost') || file.fileUrl.includes('127.0.0.1'))) {
        // extract relative path starting from 'uploads'
        const relativePath = file.fileUrl.replace(/\\/g, '/').replace(/.*uploads\//, 'uploads/');
        const filePath = path.resolve(__dirname, '../../', relativePath);
        
        if (fs.existsSync(filePath)) {
          return res.download(filePath, file.originalName);
        }
      }
      
      // Redirect the user directly to the Cloudinary URL
      res.redirect(file.fileUrl);
    } catch (err) {
      next(err);
    }
  };
}

module.exports = new FileController();
