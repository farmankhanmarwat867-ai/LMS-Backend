const Result = require('../models/Result');
const ReportCard = require('../models/ReportCard');
const User = require('../models/User');

class TranscriptService {
  /**
   * Get comprehensive academic transcript for a student
   * @param {string} studentId
   * @param {string} instituteId
   */
  async getStudentTranscript(studentId, instituteId) {
    const student = await User.findOne({ _id: studentId, instituteId, role: 'STUDENT' })
      .select('firstName lastName email profilePicture enrollmentNumber classId sectionId');
    
    if (!student) {
      throw new Error('Student not found or access denied');
    }

    // Fetch all finalized report cards (terms/sessions)
    const reportCards = await ReportCard.find({ studentId, isPublished: true })
      .populate('sessionId', 'name startDate endDate')
      .populate('classId', 'name')
      .sort({ createdAt: 1 })
      .lean();

    // Fetch all individual results
    const results = await Result.find({ studentId, isPublished: true, isDeleted: false })
      .populate({
        path: 'examScheduleId',
        populate: [
          { path: 'examId', select: 'title type date' },
          { path: 'courseId', select: 'title credits' }
        ]
      })
      .sort({ createdAt: 1 })
      .lean();

    // Calculate Cumulative GPA (CGPA)
    let totalGradePoints = 0;
    let totalCredits = 0;

    const formattedResults = results.map(r => {
      const schedule = r.examScheduleId;
      const credits = schedule?.courseId?.credits || 3; // Default to 3 if missing
      
      totalGradePoints += (r.gradePoint || 0) * credits;
      totalCredits += credits;

      return {
        _id: r._id,
        exam: schedule?.examId?.title,
        course: schedule?.courseId?.title,
        marksObtained: r.marksObtained,
        totalMarks: schedule?.totalMarks,
        percentage: r.percentage,
        grade: r.grade,
        gradePoint: r.gradePoint,
        status: r.status,
      };
    });

    const cgpa = totalCredits > 0 ? (totalGradePoints / totalCredits).toFixed(2) : 0;

    // Structured JSON Payload for frontend to render / convert to PDF
    return {
      student: {
        id: student._id,
        name: `${student.firstName} ${student.lastName}`,
        email: student.email,
        enrollmentNumber: student.enrollmentNumber,
      },
      academicSummary: {
        totalTermsCompleted: reportCards.length,
        totalCreditsAttempted: totalCredits,
        cgpa: parseFloat(cgpa),
      },
      terms: reportCards.map(rc => ({
        term: rc.sessionId?.name,
        class: rc.classId?.name,
        termGpa: rc.gpa,
        totalMarks: rc.totalMarks,
        obtainedMarks: rc.obtainedMarks,
        percentage: rc.percentage,
        grade: rc.grade,
        status: rc.status,
        remarks: rc.remarks,
      })),
      detailedResults: formattedResults,
      issuedAt: new Date(),
    };
  }
}

module.exports = new TranscriptService();
