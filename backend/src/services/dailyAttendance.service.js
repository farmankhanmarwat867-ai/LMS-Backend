const User = require('../models/User');
const DailyAttendance = require('../models/DailyAttendance');
const { ROLES } = require('../constants/roles');

// Mock Notification Service for Parent Notifications architecture
const NotificationService = {
  notifyParent: async (student, checkInTime) => {
    // In the future, send SMS/WhatsApp/Push here
    console.log(`[Notification] To Parent: Your child ${student.name} arrived at school at ${checkInTime}.`);
  }
};

const scanGateAttendance = async (data, user, tenantFilter) => {
  const { qrCodeValue } = data;

  // 1. Find Student by permanent QR Code Value
  const student = await User.findOne({ qrCodeValue, role: ROLES.STUDENT });
  
  if (!student) {
    throw { status: 404, message: 'Student Not Found' };
  }

  // 2. Verify Student is Active
  if (!student.isActive || student.isDeleted) {
    throw { status: 403, message: 'Student Account Inactive' };
  }

  // Tenant Isolation Check (if the scanning device belongs to a specific branch/institute)
  if (tenantFilter.instituteId && student.instituteId?.toString() !== tenantFilter.instituteId.toString()) {
    throw { status: 403, message: 'Student belongs to a different institute' };
  }

  // 3. Check if Attendance is Already Marked Today
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const existingAttendance = await DailyAttendance.findOne({
    studentId: student._id,
    attendanceDate: {
      $gte: today,
      $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
    }
  });

  if (existingAttendance) {
    throw { status: 409, message: 'Attendance already recorded today.' };
  }

  // 4. Create Attendance Record
  const now = new Date();
  const attendanceRecord = await DailyAttendance.create({
    studentId: student._id,
    rollNumber: student.rollNumber,
    classId: student.classId,
    sectionId: student.sectionId,
    attendanceDate: today,
    checkInTime: now,
    status: 'PRESENT',
    attendanceMethod: 'QR',
    instituteId: student.instituteId,
    branchId: student.branchId,
    createdBy: user._id,
    updatedBy: user._id
  });

  // 5. Trigger Notifications asynchronously
  NotificationService.notifyParent(student, now.toLocaleTimeString()).catch(err => console.error(err));

  return {
    attendance: attendanceRecord,
    student: {
      _id: student._id,
      name: student.name,
      studentId: student.studentId,
      rollNumber: student.rollNumber,
      photo: student.avatar
    }
  };
};

const getDailyReports = async (queryOptions, tenantFilter) => {
  const query = { ...tenantFilter, isDeleted: { $ne: true } };

  if (queryOptions.date) {
    const targetDate = new Date(queryOptions.date);
    targetDate.setHours(0, 0, 0, 0);
    query.attendanceDate = targetDate;
  }
  if (queryOptions.classId) query.classId = queryOptions.classId;
  if (queryOptions.sectionId) query.sectionId = queryOptions.sectionId;
  if (queryOptions.studentId) query.studentId = queryOptions.studentId;

  return await DailyAttendance.find(query)
    .populate('studentId', 'name studentId rollNumber avatar')
    .populate('classId', 'name')
    .populate('sectionId', 'name')
    .sort({ checkInTime: -1 });
};

module.exports = {
  scanGateAttendance,
  getDailyReports
};
