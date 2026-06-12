require('dotenv').config();
const emailService = require('./src/services/email.service');

async function testEmail() {
  console.log('\n── Email Integration Test ──────────────────────────────────\n');
  
  // Note: Unless SMTP_USER/PASS are set in .env, this will fail gracefully.
  const result = await emailService.sendEmail(
    'test@example.com',
    'Welcome to the LMS!',
    '<p>This is a test message to verify the Nodemailer integration.</p>'
  );

  if (result.status === 'sent') {
    console.log(`✅ Email sent successfully! Message ID: ${result.messageId}`);
    process.exit(0);
  } else {
    console.log(`⚠️ Email sending failed: ${result.reason}`);
    console.log(`\n(This is expected if your .env Mailtrap/Gmail keys are empty or invalid)`);
    process.exit(0); // We exit 0 because the service gracefully handled the error
  }
}

testEmail();
