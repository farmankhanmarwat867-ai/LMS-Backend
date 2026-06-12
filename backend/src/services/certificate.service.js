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
      throw new Error('Invalid student ID');
    }

    // 1. Generate unique certificate number
    const uniqueId = crypto.randomBytes(4).toString('hex').toUpperCase();
    const certificateNumber = `CERT-${new Date().getFullYear()}-${uniqueId}`;

    // 2. Generate digital signature hash based on content
    const signatureData = `${studentId}-${type}-${courseId}-${certificateNumber}-${instituteId}`;
    const digitalSignature = crypto.createHash('sha256').update(signatureData).digest('hex');

    // 3. Generate QR Code URL (Points to frontend verification page)
    const baseUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    const qrCodeUrl = `${baseUrl}/verify-certificate?cert=${certificateNumber}`;

    const certificate = new Certificate({
      studentId,
      type,
      courseId,
      title,
      description,
      certificateNumber,
      qrCodeUrl,
      digitalSignature,
      issuedBy,
      instituteId: instituteId || student.instituteId,
      branchId: branchId || student.branchId,
    });

    await certificate.save();
    return certificate;
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
      .populate('studentId', 'firstName lastName email profilePicture')
      .populate('issuedBy', 'firstName lastName')
      .populate('courseId', 'title')
      .populate('instituteId', 'name logo');

    if (!certificate) {
      throw new Error('Certificate not found or invalid');
    }

    return certificate;
  }
}

module.exports = new CertificateService();
