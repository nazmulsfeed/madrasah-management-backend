require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

// Register models
require('./models/Institution');
require('./models/Branch');
require('./models/AcademicYear');
require('./models/ClassLevel');
require('./models/Section');
require('./models/User');
require('./models/Student');
require('./models/StudentEnrollment');
require('./models/Teacher');
require('./models/Guardian');
require('./models/Subject');
require('./models/StudentAttendance');
require('./models/Homework');
require('./models/HomeworkSubmission');
require('./models/RolePermission');

require('./models/Exam');
require('./models/MarkEntry');
require('./models/HifzDailyProgress');

require('./models/Invoice');
require('./models/Payment');
require('./models/Notice');
require('./models/PushSubscription');
require('./models/TeacherAttendance');
require('./models/Book');
require('./models/Hostel');
require('./models/IncomeCategory');
require('./models/Income');
require('./models/Account');
require('./models/JournalEntry');
require('./models/Voucher');
require('./models/QurbaniSkin');
require('./models/FundTransfer');


const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const studentRoutes = require('./routes/students');
const teacherRoutes = require('./routes/teachers');
const guardianRoutes = require('./routes/guardians');
const attendanceRoutes = require('./routes/attendance');
const homeworkRoutes = require('./routes/homework');
const examRoutes = require('./routes/exams');
const hifzRoutes = require('./routes/hifz');
const financeRoutes = require('./routes/finance');
const incomeRoutes = require('./routes/income');
const accountingRoutes = require('./routes/accounting');
const voucherRoutes = require('./routes/voucher');
const noticeRoutes = require('./routes/notices');
const pushRoutes = require('./routes/push');
const rolePermissionRoutes = require('./routes/rolePermission');
const reportRoutes = require('./routes/reports');
const bookRoutes = require('./routes/books');
const hostelRoutes = require('./routes/hostel');
const dashboardRoutes = require('./routes/dashboard');
const auditLogRoutes = require('./routes/auditLog');
const madrasahRoutes = require('./routes/madrasah');

const app = express();

// মিডলওয়্যার
app.use(cors({
  origin: (origin, callback) => {
    if (
      !origin ||
      origin.includes('annurislamicacademy.edu.bd') ||
      origin.includes('localhost') ||
      origin.includes('127.0.0.1') ||
      origin.includes('144.217.68.82')
    ) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all fallback
    }
  },
  credentials: true,
}));
app.use((req, res, next) => {
  if (!req.url.startsWith('/api')) {
    req.url = '/api' + req.url;
  }
  // RFC 7230 fix for LiteSpeed / Passenger HTTP/2 POST requests where both Transfer-Encoding and Content-Length are sent
  if (req.headers['transfer-encoding'] && req.headers['content-length']) {
    delete req.headers['content-length'];
  }
  console.log(`[REQ] ${req.method} ${req.url}`);
  next();
});
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// রাউট
app.get('/api/v1/health', (req, res) => {
  res.json({ success: true, message: 'সার্ভার চালু আছে ✅', timestamp: new Date() });
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/students', studentRoutes);
app.use('/api/v1/teachers', teacherRoutes);
app.use('/api/v1/guardians', guardianRoutes);
app.use('/api/v1/attendance', attendanceRoutes);
app.use('/api/v1/homework', homeworkRoutes);
app.use('/api/v1/exams', examRoutes);
app.use('/api/v1/hifz', hifzRoutes);
app.use('/api/v1/finance', financeRoutes);
app.use('/api/v1/madrasah', madrasahRoutes);
app.use('/api/v1/finance/incomes', incomeRoutes);
app.use('/api/v1/accounting', accountingRoutes);
app.use('/api/v1/vouchers', voucherRoutes);
app.use('/api/v1/notices', noticeRoutes);
app.use('/api/v1/push', pushRoutes);
app.use('/api/v1/permissions', rolePermissionRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/books', bookRoutes);
app.use('/api/v1/hostels', hostelRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/audit-logs', auditLogRoutes);


// ৪০৪ হ্যান্ডলার
app.use((req, res) => {
  res.status(404).json({ success: false, message: `${req.originalUrl} — এই রাউট পাওয়া যায়নি` });
});

// এরর হ্যান্ডলার
app.use(errorHandler);

// সার্ভার চালু
const PORT = process.env.PORT || 5000;

const start = async () => {
  await db.connectDB();
  
  // Apply one-time notice permission and branch corruption fix
  try {
    const RolePermission = require('./models/RolePermission');
    const perms = await RolePermission.findAll({ where: { role: ['teacher', 'hifz_teacher'] } });
    for (const p of perms) {
      let permissions = p.permissions;
      if (typeof permissions === 'string') {
        try { permissions = JSON.parse(permissions); } catch(e){}
      }
      if (permissions && permissions.can_manage_notice === false) {
        permissions.can_manage_notice = true;
        p.permissions = permissions;
        p.changed('permissions', true);
        await p.save();
        console.log(`[Migration] Fixed notice permission to true for role: ${p.role}`);
      }
    }

    // Fix Branch bug corruption
    const User = require('./models/User');
    const corruptedUsers = await User.findAll({ 
      where: { 
        institution: ['Dhaka Main Branch', 'Chittagong Branch', 'Sylhet Branch'] 
      } 
    });
    for (const u of corruptedUsers) {
      const wrongInst = u.institution;
      u.institution = 'আন-নুর-ইসলামিক একাডেমি';
      if (!u.branch) {
        u.branch = wrongInst;
      }
      await u.save();
      console.log(`[Migration] Fixed corrupted institution for user ${u.username}`);
    }
  } catch (error) {
    console.error('[Migration] Failed to run database migrations:', error.message);
  }

  // Start Monthly Invoice Auto-Scheduler
  const { startInvoiceScheduler } = require('./utils/invoiceScheduler');
  startInvoiceScheduler();

  app.listen(PORT, () => {
    console.log(`🚀  সার্ভার চালু হয়েছে পোর্ট ${PORT} এ`);
    console.log(`📍 http://localhost:${PORT}/api/v1/health`);
  });
};

start();
