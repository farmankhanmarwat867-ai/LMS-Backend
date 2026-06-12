const transcriptService = require('../services/transcript.service');
const apiResponse = require('../utils/apiResponse');

class TranscriptController {
  /**
   * GET /api/transcripts/:studentId
   * Fetch a student's aggregated academic transcript
   */
  getStudentTranscript = async (req, res, next) => {
    try {
      const { studentId } = req.params;
      const { instituteId } = req.user;

      const transcript = await transcriptService.getStudentTranscript(studentId, instituteId);

      return apiResponse.success(res, transcript, 'Transcript retrieved successfully');
    } catch (err) {
      next(err);
    }
  };
}

module.exports = new TranscriptController();
