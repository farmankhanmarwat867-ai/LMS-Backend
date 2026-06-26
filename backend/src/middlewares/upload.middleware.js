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

let storage;

// Use Cloudinary in production, or if FORCE_CLOUDINARY is explicitly true.
// Otherwise, default to local disk storage for development.
const useCloudinary = process.env.FORCE_CLOUDINARY === 'true' || 
                      (process.env.NODE_ENV === 'production' && 
                       process.env.CLOUDINARY_CLOUD_NAME && 
                       process.env.CLOUDINARY_API_KEY && 
                       process.env.CLOUDINARY_API_SECRET);

if (useCloudinary) {
  try {
    const { CloudinaryStorage } = require('multer-storage-cloudinary');
    const cloudinary = require('../config/cloudinary');

    storage = new CloudinaryStorage({
      cloudinary: cloudinary,
      params: async (req, file) => {
        let folderName = req.body.folder || 'general';
        if (!ALLOWED_FOLDERS.includes(folderName)) {
          folderName = 'general';
        }

        return {
          folder: `lms/${folderName}`,
          resource_type: 'auto', 
          public_id: `${Date.now()}-${Math.round(Math.random() * 1E9)}`,
        };
      },
    });
    console.log('[Upload Middleware] Using Cloudinary Storage');
  } catch (err) {
    console.error('[Upload Middleware] Cloudinary storage initialization failed. Falling back to Disk Storage:', err.message);
  }
}

if (!storage) {
  storage = multer.diskStorage({
    destination: (req, file, cb) => {
      let folderName = req.body.folder || 'general';
      if (!ALLOWED_FOLDERS.includes(folderName)) {
        folderName = 'general';
      }
      
      const uploadDir = path.join(__dirname, '../../uploads', folderName);
      
      // Ensure destination directory exists
      fs.mkdirSync(uploadDir, { recursive: true });
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
      const ext = path.extname(file.originalname);
      cb(null, `${uniqueSuffix}${ext}`);
    }
  });
  console.log('[Upload Middleware] Using Local Disk Storage');
}

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
