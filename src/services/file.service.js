const fs = require('fs');
const path = require('path');
const File = require('../models/File');

class FileService {
  /**
   * Save file metadata to the database after multer handles upload.
   */
  async uploadFile(fileData, body, userContext) {
    const { id: uploadedBy, instituteId, branchId } = userContext;
    const folder = body.folder || 'general';

    // fileData.path is the secure URL returned by Cloudinary
    const fileUrl = fileData.path;

    const newFile = new File({
      fileName: fileData.filename || fileData.originalname, // Cloudinary uses filename or we fallback
      originalName: fileData.originalname,
      fileType: fileData.fileType || 'OTHER', // Passed from our multer filter
      mimeType: fileData.mimetype,
      fileSize: fileData.size,
      fileUrl,
      folder,
      uploadedBy,
      instituteId,
      branchId,
    });

    await newFile.save();
    return newFile;
  }

  /**
   * Handle multiple files concurrently.
   */
  async uploadMultipleFiles(files, body, userContext) {
    const uploadedFiles = [];
    for (const fileData of files) {
      const savedFile = await this.uploadFile(fileData, body, userContext);
      uploadedFiles.push(savedFile);
    }
    return uploadedFiles;
  }

  /**
   * List files for an institute (with filters).
   */
  async listFiles(filters, pagination) {
    const { instituteId, branchId, folder, fileType, page = 1, limit = 20 } = filters;
    const query = { instituteId, isDeleted: false };
    
    if (branchId) query.branchId = branchId;
    if (folder) query.folder = folder;
    if (fileType) query.fileType = fileType;

    const skip = (page - 1) * limit;

    const files = await File.find(query)
      .populate('uploadedBy', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await File.countDocuments(query);

    return {
      data: files,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single file by ID.
   */
  async getFileById(id, instituteId) {
    const file = await File.findOne({ _id: id, instituteId, isDeleted: false })
      .populate('uploadedBy', 'firstName lastName email');
    
    if (!file) throw new Error('File not found');
    return file;
  }

  /**
   * Soft delete a file from the DB. 
   * Note: In a true SaaS, you might have a cron job to permanently wipe the physical file 
   * after 30 days. We'll just softly delete the DB record here.
   */
  async deleteFile(id, userContext) {
    const { instituteId, id: userId, role } = userContext;
    const file = await File.findOne({ _id: id, instituteId, isDeleted: false });
    
    if (!file) throw new Error('File not found');

    // Simple access check: SUPER_ADMIN, INSTITUTE_ADMIN, or the original uploader can delete
    if (file.uploadedBy.toString() !== userId && !['SUPER_ADMIN', 'INSTITUTE_ADMIN'].includes(role)) {
      throw new Error('Not authorized to delete this file');
    }

    file.isDeleted = true;
    file.deletedAt = new Date();
    await file.save();

    return file;
  }

  /**
   * For Cloudinary, "downloading" via the backend usually means we just redirect
   * the user to the Cloudinary URL, or we fetch the stream and pipe it.
   * Since the URL is public, the easiest way is to return the URL for the frontend to handle.
   */
  async getFilePathForDownload(id, instituteId) {
    const file = await this.getFileById(id, instituteId);
    return file; // Controller will redirect to file.fileUrl
  }
}

module.exports = new FileService();
