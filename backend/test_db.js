require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');

async function checkUsers() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB.");
    
    const db = mongoose.connection.db;
    const users = await db.collection('users').find({}).limit(5).toArray();
    
    console.log("Registered Emails in DB:");
    users.forEach(u => console.log(`- ${u.email} (Role: ${u.role})`));
    
  } catch(err) {
    console.error(err);
  } finally {
    mongoose.connection.close();
  }
}

checkUsers();
