const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const db = mongoose.connection.db;
  const course = await db.collection('courses').findOne();
  if (course) {
    await db.collection('attendances').updateMany({}, { $set: { courseId: course._id } });
    console.log('Fixed attendances');
  } else {
    console.log('No courses found!');
  }
  process.exit(0);
});
