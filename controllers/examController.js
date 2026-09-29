const Exam = require('../models/Exam');
const MarkEntry = require('../models/MarkEntry');
const AcademicYear = require('../models/AcademicYear');
const Student = require('../models/Student');
const Guardian = require('../models/Guardian');
const ApiResponse = require('../utils/apiResponse');

// @desc    সকল পরীক্ষা তালিকা
// @route   GET /api/v1/exams
exports.getExams = async (req, res, next) => {
  try {
    const filter = { institution: req.user.institution };
    if (req.query.status) filter.status = req.query.status;

    const exams = await Exam.find(filter)
      .populate('classLevel', 'name code')
      .sort({ startDate: -1 });

    ApiResponse.success(res, { exams });
  } catch (error) {
    next(error);
  }
};

// @desc    নতুন পরীক্ষা তৈরি
// @route   POST /api/v1/exams
exports.createExam = async (req, res, next) => {
  try {
    const { name, classLevel, startDate, endDate, status } = req.body;

    if (!name) {
      return ApiResponse.error(res, 'পরীক্ষার নাম আবশ্যক', 400);
    }

    let academicYear = await AcademicYear.findOne({ institution: req.user.institution, isCurrent: true });
    if (!academicYear) {
      academicYear = await AcademicYear.findOne({ institution: req.user.institution });
    }

    const exam = await Exam.create({
      institution: req.user.institution,
      academicYear: academicYear ? academicYear._id : null,
      name,
      classLevel: classLevel || null,
      startDate: startDate || null,
      endDate: endDate || null,
      status: status || 'upcoming',
    });

    const populated = await Exam.findById(exam._id).populate('classLevel', 'name code');

    ApiResponse.created(res, { exam: populated }, 'পরীক্ষা সফলভাবে তৈরি হয়েছে');
  } catch (error) {
    next(error);
  }
};

// @desc    নম্বর এন্ট্রি দেখা
// @route   GET /api/v1/exams/marks
exports.getMarks = async (req, res, next) => {
  try {
    const filter = { institution: req.user.institution };
    
    if (req.query.exam) filter.exam = req.query.exam;
    if (req.query.subject) filter.subject = req.query.subject;
    if (req.query.student) filter.student = req.query.student;

    // --- Student/Guardian scoping: only own/linked student's marks ---
    const userType = req.user.userType;

    if (userType === 'student') {
      const student = await Student.findOne({ user: req.user._id });
      if (student) {
        filter.student = student._id;
      } else {
        return ApiResponse.success(res, { marks: [] });
      }
    } else if (userType === 'guardian') {
      const guardian = await Guardian.findOne({ user: req.user._id });
      if (guardian && guardian.students && guardian.students.length > 0) {
        const linkedStudentIds = guardian.students.map(s => s.student);
        filter.student = { $in: linkedStudentIds };
      } else {
        return ApiResponse.success(res, { marks: [] });
      }
    }

    const marks = await MarkEntry.find(filter)
      .populate('student', 'studentId user currentEnrollment')
      .populate('subject', 'name code')
      .populate('exam', 'name');

    // Enrich marks with student user name and enrollment info
    const User = require('../models/User');
    const StudentEnrollment = require('../models/StudentEnrollment');

    const enrichedMarks = await Promise.all(marks.map(async (m) => {
      const markObj = typeof m.toJSON === 'function' ? m.toJSON() : { ...m };
      if (markObj.student && typeof markObj.student === 'object') {
        if (markObj.student.user) {
          const userDoc = await User.findById(markObj.student.user);
          if (userDoc) {
            markObj.student.firstName = userDoc.firstName || '';
            markObj.student.lastName = userDoc.lastName || '';
            markObj.student.fullName = userDoc.fullName || `${userDoc.firstName || ''} ${userDoc.lastName || ''}`.trim();
            markObj.student.user = {
              _id: userDoc._id,
              firstName: userDoc.firstName,
              lastName: userDoc.lastName,
              fullName: markObj.student.fullName
            };
          }
        }
        if (markObj.student.currentEnrollment) {
          const enrollDoc = await StudentEnrollment.findById(markObj.student.currentEnrollment);
          if (enrollDoc) {
            markObj.student.currentEnrollment = {
              _id: enrollDoc._id,
              rollNumber: enrollDoc.rollNumber,
              section: enrollDoc.section
            };
          }
        }
      }
      return markObj;
    }));

    ApiResponse.success(res, { marks: enrichedMarks });
  } catch (error) {
    next(error);
  }
};

// @desc    নম্বর এন্ট্রি করা বা আপডেট করা
// @route   POST /api/v1/exams/marks
exports.saveMarks = async (req, res, next) => {
  try {
    const { exam, subject, marks } = req.body;
    // marks is an array: [{ studentId, marksObtained }]

    const upsertOps = [];
    const deleteOps = [];

    for (const m of marks) {
      if (m.marksObtained === null || m.marksObtained === undefined || m.marksObtained === '') {
        deleteOps.push({
          deleteOne: {
            filter: { exam, student: m.studentId, subject }
          }
        });
      } else {
        const score = parseFloat(m.marksObtained);
        let grade = 'F';
        if (score >= 80) grade = 'A+';
        else if (score >= 70) grade = 'A';
        else if (score >= 60) grade = 'A-';
        else if (score >= 50) grade = 'B';
        else if (score >= 40) grade = 'C';
        else if (score >= 33) grade = 'D';

        upsertOps.push({
          updateOne: {
            filter: { exam, student: m.studentId, subject },
            update: {
              $set: {
                institution: req.user.institution,
                exam,
                subject,
                student: m.studentId,
                marksObtained: score,
                grade,
                enteredBy: req.user._id,
              }
            },
            upsert: true,
          }
        });
      }
    }

    if (upsertOps.length > 0) {
      await MarkEntry.bulkWrite(upsertOps);
    }
    if (deleteOps.length > 0) {
      await MarkEntry.bulkWrite(deleteOps);
    }

    ApiResponse.success(res, null, 'নম্বর সফলভাবে সংরক্ষণ করা হয়েছে');
  } catch (error) {
    next(error);
  }
};

// @desc    পরীক্ষা আপডেট
// @route   PATCH /api/v1/exams/:id
exports.updateExam = async (req, res, next) => {
  try {
    const exam = await Exam.findOneAndUpdate(
      { _id: req.params.id, institution: req.user.institution },
      req.body,
      { new: true, runValidators: true }
    ).populate('classLevel', 'name code');

    if (!exam) {
      return ApiResponse.notFound(res, 'পরীক্ষা পাওয়া যায়নি');
    }

    ApiResponse.success(res, { exam }, 'পরীক্ষা সফলভাবে আপডেট করা হয়েছে');
  } catch (error) {
    next(error);
  }
};

// @desc    পরীক্ষা মুছে ফেলা
// @route   DELETE /api/v1/exams/:id
exports.deleteExam = async (req, res, next) => {
  try {
    const exam = await Exam.findOneAndDelete({ _id: req.params.id, institution: req.user.institution });

    if (!exam) {
      return ApiResponse.notFound(res, 'পরীক্ষা পাওয়া যায়নি');
    }

    // Associated marks also need to be deleted
    await MarkEntry.deleteMany({ exam: req.params.id });

    ApiResponse.success(res, null, 'পরীক্ষা সফলভাবে মুছে ফেলা হয়েছে');
  } catch (error) {
    next(error);
  }
};
