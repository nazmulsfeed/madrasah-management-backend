const ExamRoutine = require('../models/ExamRoutine');
const Student = require('../models/Student');
const StudentEnrollment = require('../models/StudentEnrollment');
const Guardian = require('../models/Guardian');
const ApiResponse = require('../utils/apiResponse');

// @desc    সকল পরীক্ষার রুটিন তালিকা
// @route   GET /api/v1/exams/routines
exports.getExamRoutines = async (req, res, next) => {
  try {
    const institution = req.user.institution;
    const filter = {};
    if (institution) {
      filter.institution = institution;
    }

    if (req.query.exam && req.query.exam !== 'all') {
      filter.exam = req.query.exam;
    }
    if (req.query.classLevel && req.query.classLevel !== 'all') {
      filter.classLevel = req.query.classLevel;
    }
    if (req.query.stream && req.query.stream !== 'all') {
      filter.stream = req.query.stream;
    }
    if (req.query.status && req.query.status !== 'all') {
      filter.status = req.query.status;
    }

    // Students and guardians can only view published routines
    if (req.user.userType === 'student' || req.user.userType === 'guardian') {
      filter.status = 'published';
    }

    const routines = await ExamRoutine.findAll({
      where: filter,
      order: [['createdAt', 'DESC']],
    });

    ApiResponse.success(res, { routines });
  } catch (error) {
    next(error);
  }
};

// @desc    একক পরীক্ষার রুটিন বিস্তারিত
// @route   GET /api/v1/exams/routines/:id
exports.getExamRoutineById = async (req, res, next) => {
  try {
    const routine = await ExamRoutine.findOne({
      where: {
        _id: req.params.id,
        institution: req.user.institution,
      },
    });

    if (!routine) {
      return ApiResponse.notFound(res, 'পরীক্ষার রুটিন পাওয়া যায়নি');
    }

    ApiResponse.success(res, { routine });
  } catch (error) {
    next(error);
  }
};

// @desc    পরীক্ষার রুটিন তৈরি বা হালনাগাদ (Create or Update)
// @route   POST /api/v1/exams/routines
exports.createOrUpdateExamRoutine = async (req, res, next) => {
  try {
    const {
      _id,
      exam,
      examName,
      classLevel,
      className,
      stream,
      title,
      status,
      instructions,
      schedule,
      academicYear,
    } = req.body;

    if (!title || !title.trim()) {
      return ApiResponse.error(res, 'রুটিনের শিরোনাম আবশ্যক', 400);
    }

    const institution = req.user.institution;
    const routineData = {
      institution,
      academicYear: academicYear || null,
      exam: exam || null,
      examName: examName || '',
      classLevel: classLevel || null,
      className: className || '',
      stream: stream || 'all',
      title: title.trim(),
      status: status || 'published',
      instructions: instructions || '',
      schedule: Array.isArray(schedule) ? schedule : [],
      createdBy: req.user._id,
    };

    let routine;
    if (_id) {
      routine = await ExamRoutine.findOne({
        where: { _id, institution },
      });
      if (!routine) {
        return ApiResponse.notFound(res, 'হালনাগাদ করার জন্য রুটিনটি পাওয়া যায়নি');
      }
      await routine.update(routineData);
    } else {
      routine = await ExamRoutine.create(routineData);
    }

    ApiResponse.success(res, { routine }, _id ? 'রুটিন সফলভাবে আপডেট করা হয়েছে' : 'নতুন রুটিন সফলভাবে তৈরি হয়েছে');
  } catch (error) {
    next(error);
  }
};

// @desc    পরীক্ষার রুটিন মুছে ফেলা
// @route   DELETE /api/v1/exams/routines/:id
exports.deleteExamRoutine = async (req, res, next) => {
  try {
    const deleted = await ExamRoutine.destroy({
      where: {
        _id: req.params.id,
        institution: req.user.institution,
      },
    });

    if (!deleted) {
      return ApiResponse.notFound(res, 'মুছে ফেলার জন্য রুটিনটি পাওয়া যায়নি');
    }

    ApiResponse.success(res, null, 'পরীক্ষার রুটিন সফলভাবে মুছে ফেলা হয়েছে');
  } catch (error) {
    next(error);
  }
};

// @desc    শিক্ষার্থীর স্ব-স্ব পরীক্ষার রুটিন (Student / Guardian View)
// @route   GET /api/v1/exams/student-routine
exports.getStudentExamRoutine = async (req, res, next) => {
  try {
    const userType = req.user.userType;
    let studentId = req.query.studentId;

    if (userType === 'student') {
      const student = await Student.findOne({ where: { user: req.user._id, institution: req.user.institution, isDeleted: false } });
      if (!student) {
        return ApiResponse.success(res, { routines: [] });
      }
      studentId = student._id;
    } else if (userType === 'guardian') {
      const guardian = await Guardian.findOne({ where: { user: req.user._id, institution: req.user.institution } });
      const linked = guardian && guardian.students ? guardian.students.map(s => String(s.student)) : [];
      if (!studentId && linked.length > 0) {
        studentId = linked[0];
      }
    }

    if (!studentId) {
      return ApiResponse.success(res, { routines: [] });
    }

    const studentDoc = await Student.findOne({
      where: { _id: studentId, institution: req.user.institution, isDeleted: false },
    });
    if (!studentDoc) {
      return ApiResponse.success(res, { routines: [] });
    }

    const enrollment = await StudentEnrollment.findOne({
      where: { student: studentId, institution: req.user.institution, enrollmentStatus: 'active' },
    });

    const enrolledClassId = enrollment ? String(enrollment.classLevel) : '';
    const studentDept = (studentDoc.department || '').trim();

    // Determine student stream: Hifz or Noorani
    let detectedStream = 'noorani';
    if (studentDept.includes('হিফজ') || studentDept.includes('নাজেরা') || studentDept.includes('মক্তব') || studentDoc.hifzProgramType) {
      detectedStream = 'hifz';
    }

    // Find routines for this student's class, or stream, or general/all
    const allRoutines = await ExamRoutine.findAll({
      where: {
        institution: req.user.institution,
        status: 'published',
      },
      order: [['createdAt', 'DESC']],
    });

    const matchingRoutines = allRoutines.filter(r => {
      // Stream matching: 'all' or matches student's stream
      const streamMatch = r.stream === 'all' || r.stream === detectedStream;
      // Class matching: if routine specifies class, it must match student's enrolled class
      const classMatch = !r.classLevel || r.classLevel === 'all' || r.classLevel === enrolledClassId;
      return streamMatch && classMatch;
    });

    ApiResponse.success(res, {
      routines: matchingRoutines,
      studentInfo: {
        studentId: studentDoc.studentId,
        stream: detectedStream,
        department: studentDept,
        classLevel: enrolledClassId,
      },
    });
  } catch (error) {
    next(error);
  }
};
