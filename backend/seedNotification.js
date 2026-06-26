require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const Notification = require('./src/models/Notification');

const seedNotification = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const admin = await User.findOne({ email: 'educorelms7@gmail.com' });
    
    if (!admin) {
      console.log('Super admin not found!');
      process.exit(1);
    }

    const notification = new Notification({
      userId: admin._id,
      type: 'GENERAL',
      title: 'Welcome to EduEnterprise ERP!',
      message: 'This is a real test notification to verify that the inbox is working correctly. You can click on this to mark it as read.',
      isRead: false,
      channels: ['IN_APP']
    });

    await notification.save();
    console.log('Test notification seeded successfully!');

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
};

seedNotification();
