require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const migrate = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  const students = await User.find({ role: 'STUDENT', studentId: { $exists: false } });
  console.log(`Found ${students.length} students without a studentId`);

  const currentYear = new Date().getFullYear();
  const prefix = `STD-${currentYear}-`;
  
  // Find the highest studentId for the current year
  const lastStudent = await User.findOne({
    studentId: new RegExp(`^${prefix}`)
  }).sort({ studentId: -1 });

  let sequence = 1;
  if (lastStudent && lastStudent.studentId) {
    const lastSequence = parseInt(lastStudent.studentId.split('-')[2], 10);
    if (!isNaN(lastSequence)) {
      sequence = lastSequence + 1;
    }
  }

  for (let student of students) {
    const paddedSequence = sequence.toString().padStart(6, '0');
    const newStudentId = `${prefix}${paddedSequence}`;
    
    student.studentId = newStudentId;
    student.qrCodeValue = newStudentId;
    student.rollNumber = sequence.toString(); // Default roll number as sequence

    await student.save();
    console.log(`Updated student ${student.name} with ID ${newStudentId}`);
    
    sequence++;
  }

  console.log('Migration Complete!');
  process.exit(0);
};

migrate().catch(err => {
  console.error(err);
  process.exit(1);
});
