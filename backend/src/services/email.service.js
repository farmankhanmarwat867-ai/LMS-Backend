const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = this._createTransporter();
  }

  /**
   * Creates a Nodemailer transporter based on the current environment.
   */
  _createTransporter() {
    const provider = process.env.EMAIL_PROVIDER || '';

    if (provider.toLowerCase() === 'gmail') {
      return nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    } else {
      return nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
        port: parseInt(process.env.SMTP_PORT) || 2525,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    }
  }

  /**
   * Dispatches an email using a standardized HTML wrapper.
   */
  async sendEmail(to, subject, htmlContent) {
    try {
      const mailOptions = {
        from: `LMS ERP <${process.env.EMAIL_FROM || process.env.SMTP_USER || 'noreply@lmserp.com'}>`,
        to,
        subject,
        html: this._wrapInTemplate(subject, htmlContent),
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log(`[EMAIL] Sent to ${to}: ${info.messageId}`);
      return { status: 'sent', messageId: info.messageId, email: to };
    } catch (error) {
      console.error(`[EMAIL ERROR] Failed to send email to ${to}:`, error.message);
      // We return failure status rather than throwing to prevent crushing the main thread
      return { status: 'failed', reason: error.message, email: to };
    }
  }

  /**
   * A clean, generic HTML template wrapper for all system emails.
   */
  _wrapInTemplate(title, body) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Inter', Helvetica, Arial, sans-serif; background-color: #f4f7f6; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
          .header { background-color: #2563eb; color: #ffffff; padding: 30px 40px; text-align: center; }
          .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
          .content { padding: 40px; color: #334155; line-height: 1.6; font-size: 16px; }
          .footer { background-color: #f8fafc; padding: 20px 40px; text-align: center; color: #64748b; font-size: 14px; border-top: 1px solid #e2e8f0; }
          .btn { display: inline-block; padding: 12px 24px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 500; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${title}</h1>
          </div>
          <div class="content">
            ${body}
          </div>
          <div class="footer">
            <p>This is an automated message from the LMS/ERP System. Please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

module.exports = new EmailService();
