const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Maximum file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024; 

// Allowed categories mapped to folder names
const ALLOWED_FOLDERS = [
  'institutes', 'students', 'teachers', 'courses', 'assignments',
  'submissions', 'certificates', 'report-cards', 'transcripts', 'receipts', 'general'
];

// Determine file type from mimeType
const getFileType = (mimeType) => {
  if (mimeType.startsWith('image/')) return 'IMAGE';
  if (mimeType.startsWith('video/')) return 'VIDEO';
  if (
    mimeType === 'application/pdf' ||
    mimeType.includes('msword') ||
    mimeType.includes('officedocument.wordprocessingml') ||
    mimeType.includes('excel') ||
    mimeType.includes('spreadsheet') ||
    mimeType.includes('powerpoint') ||
    mimeType.includes('presentation') ||
    mimeType === 'text/plain'
  ) return 'DOCUMENT';
  if (
    mimeType.includes('zip') ||
    mimeType.includes('tar') ||
    mimeType.includes('rar')
  ) return 'ARCHIVE';
  return 'OTHER';
};

const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');

// Storage configuration (Cloudinary)
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    let folderName = req.body.folder || 'general';
    if (!ALLOWED_FOLDERS.includes(folderName)) {
      folderName = 'general';
    }

    return {
      folder: `lms/${folderName}`,
      // Cloudinary handles file types, but we'll accept common ones
      // raw allows non-image files like PDFs, Docs, etc.
      resource_type: 'auto', 
      public_id: `${Date.now()}-${Math.round(Math.random() * 1E9)}`,
    };
  },
});

// File filter for security
const fileFilter = (req, file, cb) => {
  // Reject executables and scripts
  const blockedExtensions = ['.exe', '.sh', '.bat', '.js', '.php', '.py', '.rb'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (blockedExtensions.includes(ext)) {
    return cb(new Error('File type not allowed for security reasons.'), false);
  }

  // Attach determined fileType to the file object for downstream use
  file.fileType = getFileType(file.mimetype);

  cb(null, true);
};

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter,
});

module.exports = upload;
