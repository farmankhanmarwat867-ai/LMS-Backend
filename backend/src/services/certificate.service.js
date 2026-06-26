const crypto = require('crypto');
const Certificate = require('../models/Certificate');
const User = require('../models/User');

class CertificateService {
  /**
   * Generate a new certificate.
   */
  async generateCertificate(payload, userContext) {
    const { studentId, type, courseId, title, description } = payload;
    const { id: issuedBy, instituteId, branchId } = userContext;

    // Validate student
    const student = await User.findById(studentId);
    if (!student || student.role !== 'STUDENT') {
      const err = new Error('Invalid student ID. Please select a valid enrolled student.');
      err.statusCode = 400;
      throw err;
    }

    // Resolve instituteId and branchId (fallback to student's own)
    const resolvedInstituteId = instituteId || student.instituteId;
    const resolvedBranchId = branchId || student.branchId;

    if (!resolvedInstituteId) {
      const err = new Error('Could not determine institute for this certificate.');
      err.statusCode = 400;
      throw err;
    }

    // 1. Generate unique certificate number
    const uniqueId = crypto.randomBytes(4).toString('hex').toUpperCase();
    const certificateNumber = `CERT-${new Date().getFullYear()}-${uniqueId}`;

    // 2. Generate digital signature hash based on content
    const signatureData = `${studentId}-${type}-${courseId || 'NONE'}-${certificateNumber}-${resolvedInstituteId}`;
    const digitalSignature = crypto.createHash('sha256').update(signatureData).digest('hex');

    // 3. Generate QR Code URL (Points to frontend verification page)
    const baseUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const qrCodeUrl = `${baseUrl}/verify-certificate?cert=${certificateNumber}`;

    const certData = {
      studentId,
      type,
      title,
      description,
      certificateNumber,
      qrCodeUrl,
      digitalSignature,
      issuedBy,
      instituteId: resolvedInstituteId,
      branchId: resolvedBranchId,
    };

    // Only include courseId if provided
    if (courseId) {
      certData.courseId = courseId;
    }

    const certificate = new Certificate(certData);
    await certificate.save();

    // Return populated certificate
    const populated = await Certificate.findById(certificate._id)
      .populate('studentId', 'name email')
      .populate('issuedBy', 'name')
      .populate('courseId', 'title');

    return populated;
  }

  /**
   * Get and verify certificate by ID or Certificate Number
   */
  async getCertificate(identifier) {
    let query = { isDeleted: false };
    
    // Check if identifier is a valid ObjectId, else treat as certificateNumber
    if (identifier.match(/^[0-9a-fA-F]{24}$/)) {
      query._id = identifier;
    } else {
      query.certificateNumber = identifier;
    }

    const certificate = await Certificate.findOne(query)
      .populate('studentId', 'name email avatar')
      .populate('issuedBy', 'name')
      .populate('courseId', 'title')
      .populate('instituteId', 'name logo');

    if (!certificate) {
      const err = new Error('Certificate not found or invalid');
      err.statusCode = 404;
      throw err;
    }

    return certificate;
  }

  /**
   * List all certificates (scoped to institute)
   */
  async listCertificates({ instituteId }) {
    const filter = { isDeleted: false };
    if (instituteId) filter.instituteId = instituteId;

    const certificates = await Certificate.find(filter)
      .populate('studentId', 'name email')
      .populate('issuedBy', 'name')
      .populate('courseId', 'title')
      .sort({ createdAt: -1 });
    return certificates;
  }
}

module.exports = new CertificateService();
