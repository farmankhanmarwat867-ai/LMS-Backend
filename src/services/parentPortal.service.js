const User = require('../models/User');
const Enrollment = require('../models/Enrollment');
const Attendance = require('../models/Attendance');
const Result = require('../models/Result');
const Assignment = require('../models/Assignment');
const Submission = require('../models/Submission');
const FeeInvoice = require('../models/FeeInvoice');
const Notification = require('../models/Notification');
const AcademicRecord = require('../models/AcademicRecord');

class ParentPortalService {
  /**
   * Helper: Ensure the child belongs to the parent
   */
  async _verifyChildAccess(parentId, childId) {
    const parent = await User.findById(parentId);
    if (!parent) throw new Error('Parent not found');

    const isChild = parent.parentOf.some(id => id.toString() === childId.toString());
    if (!isChild) throw new Error('Unauthorized access to this student');
    
    return parent;
  }

  /**
   * Get unified dashboard summary for the parent
   */
  async getDashboard(parentId) {
    const parent = await User.findById(parentId).populate('parentOf', '_id name avatar');
    if (!parent) throw new Error('Parent not found');

    const childIds = parent.parentOf.map(c => c._id);

    // Get pending fee invoices across all children
    const pendingFees = await FeeInvoice.find({
      studentId: { $in: childIds },
      status: { $in: ['PENDING', 'PARTIAL'] },
      isDeleted: false,
    }).lean();

    const totalDue = pendingFees.reduce((acc, inv) => acc + inv.balance, 0);

    // Get recent notifications
    const recentNotifications = await Notification.find({
      userId: parentId,
      isDeleted: false,
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    return {
      childrenCount: childIds.length,
      children: parent.parentOf,
      totalPendingFees: totalDue,
      pendingInvoicesCount: pendingFees.length,
      recentNotifications,
    };
  }

  /**
   * Get detailed profiles of all children
   */
  async getChildren(parentId) {
    const parent = await User.findById(parentId).populate('parentOf');
    if (!parent) throw new Error('Parent not found');

    const childrenDetails = [];

    for (const child of parent.parentOf) {
      // Get active enrollments
      const enrollments = await Enrollment.find({
        studentId: child._id,
        status: 'ACTIVE',
        isDeleted: false,
      }).populate('courseId', 'title code');

      // Get GPA from latest AcademicRecord
      const record = await AcademicRecord.findOne({
        studentId: child._id,
      }).sort({ createdAt: -1 }).lean();

      childrenDetails.push({
        _id: child._id,
        name: child.name,
        email: child.email,
        avatar: child.avatar,
        enrollments,
        gpa: record ? record.gpa : null,
      });
    }

    return childrenDetails;
  }

  /**
   * Get child attendance summary
   */
  async getChildAttendance(parentId, childId) {
    await this._verifyChildAccess(parentId, childId);

    // Find all attendance records where the student is present/absent/late/excused
    const records = await Attendance.find({
      'attendees.studentId': childId,
    })
      .populate('courseId', 'title')
      .sort({ date: -1 })
      .lean();

    let present = 0, absent = 0, late = 0, excused = 0;
    const history = records.map(rec => {
      const entry = rec.attendees.find(a => a.studentId.toString() === childId.toString());
      if (entry) {
        if (entry.status === 'PRESENT') present++;
        else if (entry.status === 'ABSENT') absent++;
        else if (entry.status === 'LATE') late++;
        else if (entry.status === 'EXCUSED') excused++;
      }
      return {
        date: rec.date,
        course: rec.courseId?.title,
        topic: rec.topic,
        status: entry?.status || 'UNKNOWN',
        remarks: entry?.remarks || '',
      };
    });

    const totalSessions = present + absent + late + excused;
    const attendancePercentage = totalSessions === 0 ? 0 : Math.round(((present + late) / totalSessions) * 100);

    return {
      summary: { totalSessions, present, absent, late, excused, attendancePercentage },
      history,
    };
  }

  /**
   * Get child assignments
   */
  async getChildAssignments(parentId, childId) {
    await this._verifyChildAccess(parentId, childId);

    // Get courses the student is enrolled in
    const enrollments = await Enrollment.find({
      studentId: childId,
      status: 'ACTIVE',
      isDeleted: false,
    }).lean();
    const courseIds = enrollments.map(e => e.courseId);

    // Get assignments for these courses
    const assignments = await Assignment.find({
      courseId: { $in: courseIds },
      isDeleted: false,
      status: 'PUBLISHED',
    })
      .populate('courseId', 'title')
      .sort({ dueDate: 1 })
      .lean();

    // Get student's submissions for these assignments
    const assignmentIds = assignments.map(a => a._id);
    const submissions = await Submission.find({
      studentId: childId,
      assignmentId: { $in: assignmentIds },
    }).lean();

    const submissionMap = {};
    submissions.forEach(sub => {
      submissionMap[sub.assignmentId.toString()] = sub;
    });

    const enrichedAssignments = assignments.map(a => {
      const sub = submissionMap[a._id.toString()];
      let status = 'PENDING';
      if (sub) {
        status = sub.status === 'GRADED' ? 'GRADED' : 'SUBMITTED';
      } else if (new Date(a.dueDate) < new Date()) {
        status = 'OVERDUE';
      }

      return {
        _id: a._id,
        title: a.title,
        course: a.courseId?.title,
        dueDate: a.dueDate,
        maxScore: a.maxScore,
        status,
        submittedAt: sub ? sub.submittedAt : null,
        score: sub?.score || null,
        feedback: sub?.feedback || null,
      };
    });

    return enrichedAssignments;
  }

  /**
   * Get child results and report cards
   */
  async getChildResults(parentId, childId) {
    await this._verifyChildAccess(parentId, childId);

    const results = await Result.find({
      studentId: childId,
      isDeleted: false,
    })
      .populate({
        path: 'examScheduleId',
        populate: [
          { path: 'examId', select: 'title type' },
          { path: 'courseId', select: 'title' }
        ]
      })
      .sort({ createdAt: -1 })
      .lean();

    return results.map(r => {
      const schedule = r.examScheduleId;
      return {
        _id: r._id,
        exam: schedule?.examId?.title,
        type: schedule?.examId?.type,
        date: schedule?.examDate,
        course: schedule?.courseId?.title,
        marksObtained: r.marksObtained,
        totalMarks: schedule?.totalMarks,
        grade: r.grade,
        status: r.status,
        remarks: r.remarks,
      };
    });
  }

  /**
   * Get all consolidated fees for all children
   */
  async getFees(parentId) {
    const parent = await User.findById(parentId).populate('parentOf', '_id');
    if (!parent) throw new Error('Parent not found');

    const childIds = parent.parentOf.map(c => c._id);

    const invoices = await FeeInvoice.find({
      studentId: { $in: childIds },
      isDeleted: false,
    })
      .populate('studentId', 'name')
      .populate('feeStructureId', 'name')
      .sort({ dueDate: 1 })
      .lean();

    return invoices.map(inv => ({
      _id: inv._id,
      invoiceNumber: inv.invoiceNumber,
      studentName: inv.studentId?.name,
      feeStructure: inv.feeStructureId?.name,
      totalAmount: inv.totalAmount,
      balance: inv.balance,
      dueDate: inv.dueDate,
      status: inv.status,
    }));
  }
}

module.exports = new ParentPortalService();
