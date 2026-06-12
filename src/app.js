require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const connectDB = require('./config/db');
const { errorHandler, notFoundHandler } = require('./middlewares/error.middleware');

// ── Connect Database ───────────────────────────────────────────────────
connectDB();

const app = express();

// ── Security Middleware ────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || '*',
  credentials: true,
}));

// ── Rate Limiting ──────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: { success: false, message: 'Too many requests. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many login attempts. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(globalLimiter);

// ── Body Parsing ───────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Request Logger ─────────────────────────────────────────────────────
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// ── Static Files ───────────────────────────────────────────────────────
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

// ── Health Check ───────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Enterprise Multi-Tenant LMS/ERP SaaS API',
    version: '1.0.0',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Server is healthy', uptime: process.uptime() });
});

// ── Routes ─────────────────────────────────────────────────────────────
app.use('/api/auth',          authLimiter, require('./routes/auth.routes'));
app.use('/api/plans',         require('./routes/plan.routes'));
app.use('/api/institutes',    require('./routes/institute.routes'));
app.use('/api/branches',      require('./routes/branch.routes'));
app.use('/api/sessions',      require('./routes/academicSession.routes')); // Phase 4
app.use('/api/classes',       require('./routes/class.routes'));           // Phase 5
app.use('/api/sections',      require('./routes/section.routes'));         // Phase 6
app.use('/api/subjects',      require('./routes/subject.routes'));         // Phase 7

// Phase 8 — User Management (clean architecture)
app.use('/api/users',         require('./routes/user.routes'));

// Phase 9 — Course Management
app.use('/api/courses',       require('./routes/course.routes'));

// Phase 10 — Enrollments
app.use('/api/enrollments',   require('./routes/enrollment.routes'));

// Phase 11 — Assignments & Submissions
app.use('/api/assignments',   require('./routes/assignment.routes'));
app.use('/api/submissions',   require('./routes/submission.routes'));

// Phase 12 — Attendance Management
app.use('/api/attendance',    require('./routes/attendance.routes'));

// Phase 14 — Exam Management
app.use('/api/exams',         require('./routes/exam.routes'));

// Phase 15 — Exam Schedule Management
app.use('/api/exam-schedules', require('./routes/examSchedule.routes'));
app.use('/api/results',        require('./routes/result.routes')); // Phase 16
app.use('/api/report-cards',   require('./routes/reportCard.routes')); // Phase 17
app.use('/api/academic-records', require('./routes/academicRecord.routes')); // Phase 18

// Phase 19 — Fee Management
app.use('/api/fees',         require('./routes/fee.routes'));
app.use('/api/fee-invoices', require('./routes/feeInvoice.routes'));
app.use('/api/payments',     require('./routes/payment.routes'));

// Phase 21 — Parent Portal & Communication
app.use('/api/parent-portal', require('./routes/parentPortal.routes'));
app.use('/api/communication', require('./routes/communication.routes'));

// Phase 22 — Notifications System
app.use('/api/notifications', require('./routes/notification.routes'));

// Phase 23 — Certificates & Transcripts
app.use('/api/certificates', require('./routes/certificate.routes'));
app.use('/api/transcripts', require('./routes/transcript.routes'));

// Phase 24 — File Storage & Document Management
app.use('/api/files', require('./routes/file.routes'));

// Phase 26 — Advanced Analytics & BI
app.use('/api/analytics', require('./routes/analytics.routes'));

// Phase 6 — Announcements
app.use('/api/announcements', require('./routes/announcementRoutes'));

// Phase 7 — Dashboard Stats
app.use('/api/dashboard',     require('./routes/dashboardRoutes'));

// ── 404 Handler ────────────────────────────────────────────────────────
app.use(notFoundHandler);

// ── Global Error Handler ───────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;
