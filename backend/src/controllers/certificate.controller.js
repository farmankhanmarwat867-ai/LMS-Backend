const certificateService = require('../services/certificate.service');
const apiResponse = require('../utils/apiResponse');

class CertificateController {
  /**
   * POST /api/certificates/generate
   * Generate a new certificate.
   */
  generateCertificate = async (req, res, next) => {
    try {
      const { instituteId, branchId, id } = req.user; // id is issuedBy
      const payload = req.body;

      const certificate = await certificateService.generateCertificate(payload, {
        instituteId,
        branchId,
        id,
      });

      return apiResponse.created(res, certificate, 'Certificate generated successfully');
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /api/certificates/:id
   * Verify/View certificate by ID or Certificate Number.
   */
  getCertificateById = async (req, res, next) => {
    try {
      const certificate = await certificateService.getCertificate(req.params.id);
      return apiResponse.success(res, certificate, 'Certificate verified successfully');
    } catch (err) {
      next(err);
    }
  };
}

module.exports = new CertificateController();
