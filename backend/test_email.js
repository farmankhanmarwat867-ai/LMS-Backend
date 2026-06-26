require('dotenv').config({ path: './.env' });
const emailService = require('./src/services/email.service');

async function testEmail() {
  console.log("Testing email with provider:", process.env.EMAIL_PROVIDER);
  console.log("SMTP User:", process.env.SMTP_USER);
  const result = await emailService.sendEmail('educorelms7@gmail.com', 'Test Email', '<p>Testing email delivery</p>');
  console.log("Result:", result);
}

testEmail();
