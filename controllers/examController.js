const Exam = require('../models/Exam');
const MarkEntry = require('../models/MarkEntry');
const AcademicYear = require('../models/AcademicYear');
const Student = require('../models/Student');
const Guardian = require('../models/Guardian');
const ApiResponse = require('../utils/apiResponse');

// Helper: Convert Bengali digits to English digits
function normalizeBnNumber(val) {
  if (val === null || val === undefined) return '';
  const bnToEnMap = { '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4', '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9' };
  return String(val).replace(/[০-৯]/g, d => bnToEnMap[d]);
}

// @desc    সকল পরীক্ষা তালিকা
// @route   GET /api/v1/exams
exports.getExams = async (req, res, next) => {
  try {
    const filter = { institution: req.user.institution };
    if (req.query.status) filter.status = req.query.status;
    if (req.query.examCategory && req.query.examCategory !== 'all') {
      filter.examCategory = req.query.examCategory;
    }
    if (req.query.classLevel && req.query.classLevel !== 'all') {
      filter.classLevel = req.query.classLevel;
    }
    if (req.query.termNumber) {
      filter.termNumber = parseInt(req.query.termNumber, 10);
    }
    if (req.query.month && req.query.month !== 'all') {
      filter.month = req.query.month;
    }

    // Role-based Scoping for Student and Guardian
    const Student = require('../models/Student');
    const Guardian = require('../models/Guardian');
    const StudentEnrollment = require('../models/StudentEnrollment');

    if (req.user.userType === 'student') {
      let studentDoc = await Student.findOne({
        where: { user: req.user._id, institution: req.user.institution, isDeleted: false }
      });
      if (!studentDoc) {
        studentDoc = await Student.findOne({ user: req.user._id });
      }

      if (!studentDoc) {
        return ApiResponse.success(res, { exams: [] });
      }

      let studentClassLevel = null;
      if (studentDoc.currentEnrollment) {
        const enr = await StudentEnrollment.findById(studentDoc.currentEnrollment);
        if (enr && enr.classLevel) {
          studentClassLevel = typeof enr.classLevel === 'object' ? String(enr.classLevel._id) : String(enr.classLevel);
        }
      }
      if (!studentClassLevel) {
        const enr = await StudentEnrollment.findOne({
          where: { student: studentDoc._id, enrollmentStatus: 'active' }
        }) || await StudentEnrollment.findOne({
          student: studentDoc._id, enrollmentStatus: 'active'
        });
        if (enr && enr.classLevel) {
          studentClassLevel = typeof enr.classLevel === 'object' ? String(enr.classLevel._id) : String(enr.classLevel);
        }
      }

      if (!studentClassLevel) {
        return ApiResponse.success(res, { exams: [] });
      }

      filter.classLevel = studentClassLevel;
    } else if (req.user.userType === 'guardian') {
      let guardianDoc = null;
      if (req.user.profileId) {
        guardianDoc = await Guardian.findById(req.user.profileId);
      }
      if (!guardianDoc) {
        guardianDoc = await Guardian.findOne({ user: req.user._id });
      }

      const linkedStudentIds = guardianDoc && guardianDoc.students ? guardianDoc.students.map(s => String(s.student)) : [];
      if (linkedStudentIds.length === 0) {
        return ApiResponse.success(res, { exams: [] });
      }

      // If specific studentId is queried, verify and filter strictly for that student's class
      const targetStudentId = req.query.studentId;
      if (targetStudentId) {
        if (!linkedStudentIds.includes(String(targetStudentId))) {
          return ApiResponse.forbidden(res, 'এই শিক্ষার্থীর তথ্য দেখার অনুমতি নেই');
        }
        const sDoc = await Student.findById(targetStudentId);
        let cId = null;
        if (sDoc && sDoc.currentEnrollment) {
          const enr = await StudentEnrollment.findById(sDoc.currentEnrollment);
          if (enr && enr.classLevel) cId = typeof enr.classLevel === 'object' ? String(enr.classLevel._id) : String(enr.classLevel);
        }
        if (!cId) {
          const enr = await StudentEnrollment.findOne({
            where: { student: targetStudentId, enrollmentStatus: 'active' }
          }) || await StudentEnrollment.findOne({ student: targetStudentId, enrollmentStatus: 'active' });
          if (enr && enr.classLevel) cId = typeof enr.classLevel === 'object' ? String(enr.classLevel._id) : String(enr.classLevel);
        }
        if (!cId) {
          return ApiResponse.success(res, { exams: [] });
        }
        filter.classLevel = cId;
      } else {
        // Collect classLevels for all linked students
        const sDocs = await Student.findAll({ where: { _id: linkedStudentIds } });
        const enrollIds = sDocs.map(s => s.currentEnrollment).filter(Boolean);
        let classIds = [];
        if (enrollIds.length > 0) {
          const enrolls = await StudentEnrollment.findAll({ where: { _id: enrollIds } });
          classIds.push(...enrolls.map(e => String(e.classLevel)).filter(Boolean));
        }
        const activeEnrolls = await StudentEnrollment.findAll({
          where: { student: linkedStudentIds, enrollmentStatus: 'active' }
        });
        classIds.push(...activeEnrolls.map(e => String(e.classLevel)).filter(Boolean));
        classIds = [...new Set(classIds)];

        if (classIds.length === 0) {
          return ApiResponse.success(res, { exams: [] });
        }
        // If guardian chose a class in query, ensure it is one of their children's classes
        if (req.query.classLevel && req.query.classLevel !== 'all') {
          if (classIds.includes(String(req.query.classLevel))) {
            filter.classLevel = req.query.classLevel;
          } else {
            filter.classLevel = { $in: classIds };
          }
        } else {
          filter.classLevel = { $in: classIds };
        }
      }
    }

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
    const { 
      name, 
      classLevel, 
      startDate, 
      endDate, 
      status, 
      examCategory, 
      termNumber, 
      month, 
      selectedSubjects 
    } = req.body;

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
      examCategory: examCategory || 'general',
      termNumber: termNumber ? parseInt(termNumber, 10) : null,
      month: month || null,
      selectedSubjects: Array.isArray(selectedSubjects) ? selectedSubjects : null,
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
      .populate('subject', 'name code totalMarks')
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

    // Filter out deleted students if any
    const validMarks = enrichedMarks.filter(m => m.student && !m.student.isDeleted);

    ApiResponse.success(res, { marks: validMarks });
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

    if (!exam || !subject || !Array.isArray(marks)) {
      return ApiResponse.error(res, 'পরীক্ষা, বিষয় এবং নম্বরের তথ্য আবশ্যক', 400);
    }

    const Subject = require('../models/Subject');
    const subjectDoc = await Subject.findOne({ _id: subject, institution: req.user.institution });
    if (!subjectDoc) {
      return ApiResponse.error(res, 'বিষয় পাওয়া যায়নি', 404);
    }

    const examDoc = await Exam.findOne({ _id: exam, institution: req.user.institution });
    if (!examDoc) {
      return ApiResponse.error(res, 'পরীক্ষা পাওয়া যায়নি', 404);
    }

    // Backend validation: Verify subject is assigned to this exam's class
    if (examDoc.classLevel) {
      const targetClass = String(examDoc.classLevel);
      let assignedClasses = subjectDoc.classLevels;
      if (typeof assignedClasses === 'string') {
        try { assignedClasses = JSON.parse(assignedClasses); } catch(_) { assignedClasses = []; }
      }
      if (!Array.isArray(assignedClasses) || assignedClasses.length === 0) {
        return ApiResponse.error(res, 'এই বিষয়টি কোনো শ্রেণির জন্য নির্ধারিত (Assign) নয়', 400);
      }
      const isAssigned = assignedClasses.some(c => {
        if (!c) return false;
        if (typeof c === 'object') return String(c._id) === targetClass || String(c.name) === targetClass;
        return String(c) === targetClass;
      });
      if (!isAssigned) {
        return ApiResponse.error(res, 'এই বিষয়টি সংশ্লিষ্ট শ্রেণির পরীক্ষার জন্য নির্ধারিত নয়', 400);
      }
    }

    // Backend validation: If monthly test with 4 selected subjects, ensure subject is in selectedSubjects
    if (examDoc.examCategory === 'monthly_test' && Array.isArray(examDoc.selectedSubjects) && examDoc.selectedSubjects.length > 0) {
      const allowedSubs = examDoc.selectedSubjects.map(s => typeof s === 'object' ? String(s._id) : String(s));
      if (!allowedSubs.includes(String(subjectDoc._id))) {
        return ApiResponse.error(res, 'এই বিষয়টি এই মাসিক পরীক্ষার নির্ধারিত ৪টি বিষয়ের অন্তর্ভুক্ত নয়', 400);
      }
    }

    const subjectTotalMarks = (subjectDoc && subjectDoc.totalMarks && !isNaN(subjectDoc.totalMarks)) 
      ? parseFloat(subjectDoc.totalMarks) 
      : 100;

    // Validate and normalize marks
    for (const m of marks) {
      if (m.marksObtained !== null && m.marksObtained !== undefined && m.marksObtained !== '') {
        const rawScore = normalizeBnNumber(m.marksObtained);
        const score = parseFloat(rawScore);
        if (isNaN(score)) {
          return ApiResponse.error(res, `অকার্যকর নম্বর ইনপুট (${m.marksObtained})`, 400);
        }
        if (score > subjectTotalMarks) {
          return ApiResponse.error(
            res, 
            `প্রাপ্ত নম্বর (${score}) বিষয়ের পূর্ণমান (${subjectTotalMarks})-এর বেশি হতে পারবে না`, 
            400
          );
        }
        m.marksObtained = score;
      }
    }

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
        const percentage = subjectTotalMarks > 0 ? (score / subjectTotalMarks) * 100 : 0;
        
        let grade = 'F';
        if (percentage >= 80) grade = 'A+';
        else if (percentage >= 70) grade = 'A';
        else if (percentage >= 60) grade = 'A-';
        else if (percentage >= 50) grade = 'B';
        else if (percentage >= 40) grade = 'C';
        else if (percentage >= 33) grade = 'D';

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
                totalMarks: subjectTotalMarks,
                grade,
                breakdown: m.breakdown || null,
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

// Helper: Calculate rankings for all students in an exam with tie handling
async function calculateExamRanks(examId, institution) {
  const allMarks = await MarkEntry.find({ exam: examId, institution });

  // Exclude deleted students from calculation
  const Student = require('../models/Student');
  const distinctStudentIds = Array.from(new Set(allMarks.map(m => String(m.student)).filter(Boolean)));
  let validStudentSet = new Set();
  if (distinctStudentIds.length > 0) {
    const validStudents = await Student.findAll({
      where: {
        _id: distinctStudentIds,
        institution,
        isDeleted: false
      }
    });
    validStudentSet = new Set(validStudents.map(s => String(s._id)));
  }

  const studentTotals = new Map();
  const distinctSubjectIds = new Set();

  allMarks.forEach(m => {
    const sId = String(m.student);
    if (!validStudentSet.has(sId)) return;

    const subId = String(m.subject);
    if (m.marksObtained !== null && m.marksObtained !== undefined) {
      distinctSubjectIds.add(subId);
    }

    if (!studentTotals.has(sId)) {
      studentTotals.set(sId, {
        studentId: sId,
        totalObtained: 0,
        totalMaxMarks: 0,
        marksCount: 0,
        subjectMarks: {}
      });
    }
    const rec = studentTotals.get(sId);
    rec.totalObtained += Number(m.marksObtained) || 0;
    rec.totalMaxMarks += Number(m.totalMarks) || 100;
    rec.marksCount += 1;
    rec.subjectMarks[subId] = {
      marksObtained: m.marksObtained,
      totalMarks: m.totalMarks || 100,
      grade: m.grade
    };
  });

  const sortedList = Array.from(studentTotals.values()).sort((a, b) => b.totalObtained - a.totalObtained);

  const ranksMap = new Map();
  let currentRank = 1;
  let prevTotal = null;

  sortedList.forEach((item, index) => {
    if (prevTotal !== null && item.totalObtained === prevTotal) {
      // Shared rank for identical total scores
      ranksMap.set(item.studentId, {
        rank: currentRank,
        totalObtained: item.totalObtained,
        totalMaxMarks: item.totalMaxMarks,
        totalStudents: sortedList.length
      });
    } else {
      currentRank = index + 1;
      ranksMap.set(item.studentId, {
        rank: currentRank,
        totalObtained: item.totalObtained,
        totalMaxMarks: item.totalMaxMarks,
        totalStudents: sortedList.length
      });
      prevTotal = item.totalObtained;
    }
  });

  return { ranksMap, totalStudents: sortedList.length, sortedList, distinctSubjectIds: Array.from(distinctSubjectIds) };
}

// @desc    শিক্ষার্থীর ফলাফল ও মেধা পজিশন বিবরণী (Student Result View)
// @route   GET /api/v1/exams/student-results/:studentId?
exports.getStudentExamResults = async (req, res, next) => {
  try {
    const userType = req.user.userType;
    let targetStudentId = req.params.studentId || req.query.studentId;

    if (userType === 'student') {
      const student = await Student.findOne({ user: req.user._id });
      if (!student) {
        return ApiResponse.success(res, { results: [] });
      }
      targetStudentId = student._id;
    } else if (userType === 'guardian') {
      const guardian = await Guardian.findOne({ user: req.user._id });
      const linked = guardian && guardian.students ? guardian.students.map(s => String(s.student)) : [];
      if (!targetStudentId) {
        targetStudentId = linked[0];
      } else if (!linked.includes(String(targetStudentId))) {
        return ApiResponse.forbidden(res, 'এই শিক্ষার্থীর ফলাফল দেখার অনুমতি নেই');
      }
    }

    if (!targetStudentId) {
      return ApiResponse.error(res, 'শিক্ষার্থী আইডি আবশ্যক', 400);
    }

    let studentDoc = null;
    const cleanId = String(targetStudentId).trim();

    // Check by _id or studentId (human-readable ID like 2026001)
    studentDoc = await Student.findOne({ _id: cleanId, institution: req.user.institution });

    if (!studentDoc) {
      studentDoc = await Student.findOne({ studentId: cleanId, institution: req.user.institution });
    }

    if (!studentDoc) {
      studentDoc = await Student.findOne({ admissionNumber: cleanId, institution: req.user.institution });
    }

    if (!studentDoc) {
      return ApiResponse.notFound(res, 'শিক্ষার্থী পাওয়া যায়নি');
    }

    // Safely populate user information
    if (studentDoc.user) {
      const User = require('../models/User');
      const u = await User.findById(studentDoc.user);
      if (u) {
        studentDoc.user = {
          _id: u._id,
          firstName: u.firstName,
          lastName: u.lastName,
          fullName: u.fullName || `${u.firstName || ''} ${u.lastName || ''}`.trim(),
          avatar: u.avatar || ''
        };
      }
    }

    // Normalize to database _id
    targetStudentId = studentDoc._id;

    let enrollmentInfo = null;
    if (studentDoc.currentEnrollment) {
      const StudentEnrollment = require('../models/StudentEnrollment');
      const ClassLevel = require('../models/ClassLevel');
      enrollmentInfo = await StudentEnrollment.findById(studentDoc.currentEnrollment);
      if (enrollmentInfo && enrollmentInfo.classLevel) {
        const cl = await ClassLevel.findById(enrollmentInfo.classLevel);
        if (cl) enrollmentInfo.classLevel = cl;
      }
    }

    // Find all mark entries for this student
    const markFilter = {
      institution: req.user.institution,
      student: targetStudentId
    };
    if (req.query.examId) {
      markFilter.exam = req.query.examId;
    }

    const marks = await MarkEntry.find(markFilter)
      .populate('subject', 'name code totalMarks')
      .populate('exam', 'name examCategory termNumber month status startDate endDate selectedSubjects');

    // Group marks by Exam
    const examMap = new Map();
    marks.forEach(m => {
      const mObj = typeof m.toJSON === 'function' ? m.toJSON() : m;
      if (!mObj.exam) return;
      const eId = typeof mObj.exam === 'object' ? String(mObj.exam._id) : String(mObj.exam);
      if (!examMap.has(eId)) {
        examMap.set(eId, {
          exam: mObj.exam,
          subjects: []
        });
      }
      examMap.get(eId).subjects.push(mObj);
    });

    const results = [];

    for (const [examId, data] of examMap.entries()) {
      const { exam, subjects } = data;
      const { ranksMap, totalStudents } = await calculateExamRanks(examId, req.user.institution);
      const studentRankInfo = ranksMap.get(String(targetStudentId)) || { rank: null, totalStudents };

      let totalObtained = 0;
      let totalMaxMarks = 0;

      // Filter subjects if exam is monthly test and has selectedSubjects
      const isMonthly = exam.examCategory === 'monthly_test';
      const allowedSubjectIds = Array.isArray(exam.selectedSubjects) ? exam.selectedSubjects.map(String) : null;

      const formattedSubjects = subjects
        .filter(m => {
          if (isMonthly && allowedSubjectIds && allowedSubjectIds.length > 0) {
            const subId = m.subject && typeof m.subject === 'object' ? String(m.subject._id) : String(m.subject);
            return allowedSubjectIds.includes(subId);
          }
          return true;
        })
        .map(m => {
          const subObj = m.subject && typeof m.subject === 'object' ? m.subject : {};
          const score = Number(m.marksObtained) || 0;
          const subTotal = Number(m.totalMarks) || (Number(subObj.totalMarks) || 100);
          totalObtained += score;
          totalMaxMarks += subTotal;

          const pct = subTotal > 0 ? Math.round((score / subTotal) * 100) : 0;
          const letterGrade = m.grade || (pct >= 80 ? 'A+' : pct >= 70 ? 'A' : pct >= 60 ? 'A-' : pct >= 50 ? 'B' : pct >= 40 ? 'C' : pct >= 33 ? 'D' : 'F');
          const gradePoint = pct >= 80 ? 5.0 : pct >= 70 ? 4.0 : pct >= 60 ? 3.5 : pct >= 50 ? 3.0 : pct >= 40 ? 2.0 : pct >= 33 ? 1.0 : 0.0;
          return {
            markId: m._id,
            subjectId: subObj._id || m.subject,
            subjectName: subObj.name || 'বিষয়',
            subjectCode: subObj.code || '',
            marksObtained: score,
            totalMarks: subTotal,
            percentage: pct,
            grade: letterGrade,
            gradePoint,
            isPassed: pct >= 33
          };
        });

      const overallPercentage = totalMaxMarks > 0 ? Math.round((totalObtained / totalMaxMarks) * 100) : 0;
      let overallGrade = 'F';
      if (overallPercentage >= 80) overallGrade = 'A+';
      else if (overallPercentage >= 70) overallGrade = 'A';
      else if (overallPercentage >= 60) overallGrade = 'A-';
      else if (overallPercentage >= 50) overallGrade = 'B';
      else if (overallPercentage >= 40) overallGrade = 'C';
      else if (overallPercentage >= 33) overallGrade = 'D';

      const hasFail = formattedSubjects.some(s => !s.isPassed);
      const calculatedGpa = formattedSubjects.length > 0
        ? (hasFail ? 0.00 : Number((formattedSubjects.reduce((acc, s) => acc + s.gradePoint, 0) / formattedSubjects.length).toFixed(2)))
        : 0.00;

      results.push({
        examId: typeof exam === 'object' ? exam._id : examId,
        examName: exam.name || 'পরীক্ষা',
        examCategory: exam.examCategory || 'general',
        termNumber: exam.termNumber,
        month: exam.month,
        subjects: formattedSubjects,
        totalObtained,
        totalMaxMarks,
        overallPercentage,
        overallGrade,
        gpa: calculatedGpa,
        isPassed: !hasFail,
        position: studentRankInfo.rank,
        totalStudents: studentRankInfo.totalStudents
      });
    }

    // Calculate annual cumulative summary for this student if enrolled
    let annualCumulative = null;
    try {
      const enrolledClass = studentDoc.currentEnrollment?.classLevel;
      if (enrolledClass) {
        const classId = typeof enrolledClass === 'object' ? enrolledClass._id : enrolledClass;
        const annualData = await calculateAnnualCombinedRanks(classId, req.user.institution);
        const myRankInfo = annualData.rankings.find(r => r.studentId === String(studentDoc._id));
        if (myRankInfo) {
          annualCumulative = {
            term1: { name: annualData.termExams.term1?.name || '১ম সাময়িক', obtained: myRankInfo.term1Obtained, max: myRankInfo.term1Max },
            term2: { name: annualData.termExams.term2?.name || '২য় সাময়িক', obtained: myRankInfo.term2Obtained, max: myRankInfo.term2Max },
            term3: { name: annualData.termExams.term3?.name || '৩য় সাময়িক', obtained: myRankInfo.term3Obtained, max: myRankInfo.term3Max },
            grandTotalObtained: myRankInfo.grandTotalObtained,
            grandTotalMaxMarks: myRankInfo.grandTotalMaxMarks,
            overallPercentage: myRankInfo.overallPercentage,
            overallGrade: myRankInfo.overallGrade,
            rank: myRankInfo.rank,
            rankText: myRankInfo.rankText,
            totalStudents: annualData.totalStudents
          };
        }
      }
    } catch (e) {
      console.warn('Annual summary calculation warning:', e);
    }

    let resolvedBranchName = '';
    if (studentDoc.branch) {
      if (/^[0-9a-fA-F-]{24,36}$/.test(String(studentDoc.branch))) {
        try {
          const Branch = require('../models/Branch');
          const bDoc = await Branch.findOne({ _id: studentDoc.branch });
          resolvedBranchName = bDoc ? bDoc.name : '';
        } catch (_) {}
      } else {
        resolvedBranchName = studentDoc.branch;
      }
    }

    ApiResponse.success(res, {
      student: {
        _id: studentDoc._id,
        studentId: studentDoc.studentId,
        name: studentDoc.user?.fullName || `${studentDoc.user?.firstName || ''} ${studentDoc.user?.lastName || ''}`.trim(),
        avatar: studentDoc.user?.avatar || '',
        rollNumber: enrollmentInfo?.rollNumber || studentDoc.currentEnrollment?.rollNumber || '',
        className: enrollmentInfo?.classLevel?.name || '',
        section: enrollmentInfo?.section || '',
        department: studentDoc.department || '',
        branch: resolvedBranchName || ''
      },
      results,
      annualCumulative
    });
  } catch (error) {
    next(error);
  }
};


// Helper to calculate Annual Combined Cumulative Ranks (Term 1 + Term 2 + Term 3)
async function calculateAnnualCombinedRanks(classLevelId, institution, section = null) {
  const Exam = require('../models/Exam');
  const MarkEntry = require('../models/MarkEntry');
  const StudentEnrollment = require('../models/StudentEnrollment');

  // 1. Find all 3 Term Exams for this class
  const termExams = await Exam.find({
    institution,
    classLevel: classLevelId,
    examCategory: 'term_exam'
  }).sort({ termNumber: 1, startDate: 1 });

  const term1Exam = termExams.find(e => Number(e.termNumber) === 1);
  const term2Exam = termExams.find(e => Number(e.termNumber) === 2);
  const term3Exam = termExams.find(e => Number(e.termNumber) === 3);

  const termExamIds = termExams.map(e => e._id);

  // 2. Find enrolled active students in this class
  const enrollFilter = {
    institution,
    classLevel: classLevelId,
    enrollmentStatus: 'active'
  };
  if (section && section !== 'all') {
    enrollFilter.section = section;
  }

  const enrollments = await StudentEnrollment.findAll({
    where: enrollFilter,
    order: [['rollNumber', 'ASC']]
  });

  const rawStudentIds = enrollments.map(e => e.student).filter(Boolean);

  // Exclude deleted students
  const Student = require('../models/Student');
  let validStudentSet = new Set();
  if (rawStudentIds.length > 0) {
    const validStudents = await Student.findAll({
      where: {
        _id: rawStudentIds,
        institution,
        isDeleted: false
      }
    });
    validStudentSet = new Set(validStudents.map(s => String(s._id)));
  }

  const validEnrollments = enrollments.filter(e => validStudentSet.has(String(e.student)));
  const studentIds = validEnrollments.map(e => String(e.student));

  // 3. Find marks for these term exams
  let marks = [];
  if (termExamIds.length > 0 && studentIds.length > 0) {
    marks = await MarkEntry.find({
      institution,
      exam: { $in: termExamIds },
      student: { $in: studentIds }
    }).populate('subject', 'name totalMarks');
  }

  // Group marks by student and term
  const studentTermData = new Map();

  studentIds.forEach(id => {
    studentTermData.set(String(id), {
      studentId: String(id),
      term1Obtained: 0,
      term1Max: 0,
      term1Count: 0,
      term2Obtained: 0,
      term2Max: 0,
      term2Count: 0,
      term3Obtained: 0,
      term3Max: 0,
      term3Count: 0,
      grandTotalObtained: 0,
      grandTotalMaxMarks: 0,
      hasAnyMarks: false
    });
  });

  marks.forEach(m => {
    const sId = String(m.student);
    if (!studentTermData.has(sId)) return;
    const rec = studentTermData.get(sId);
    const score = Number(m.marksObtained) || 0;
    const max = Number(m.totalMarks) || (Number(m.subject?.totalMarks) || 100);

    const examIdStr = String(m.exam);
    if (term1Exam && String(term1Exam._id) === examIdStr) {
      rec.term1Obtained += score;
      rec.term1Max += max;
      rec.term1Count += 1;
      rec.hasAnyMarks = true;
    } else if (term2Exam && String(term2Exam._id) === examIdStr) {
      rec.term2Obtained += score;
      rec.term2Max += max;
      rec.term2Count += 1;
      rec.hasAnyMarks = true;
    } else if (term3Exam && String(term3Exam._id) === examIdStr) {
      rec.term3Obtained += score;
      rec.term3Max += max;
      rec.term3Count += 1;
      rec.hasAnyMarks = true;
    }
  });

  // Calculate grand totals & percentage
  const studentList = Array.from(studentTermData.values()).map(rec => {
    rec.grandTotalObtained = rec.term1Obtained + rec.term2Obtained + rec.term3Obtained;
    rec.grandTotalMaxMarks = rec.term1Max + rec.term2Max + rec.term3Max;
    rec.overallPercentage = rec.grandTotalMaxMarks > 0 
      ? Math.round((rec.grandTotalObtained / rec.grandTotalMaxMarks) * 100) 
      : 0;

    let grade = 'F';
    if (rec.overallPercentage >= 80) grade = 'A+';
    else if (rec.overallPercentage >= 70) grade = 'A';
    else if (rec.overallPercentage >= 60) grade = 'A-';
    else if (rec.overallPercentage >= 50) grade = 'B';
    else if (rec.overallPercentage >= 40) grade = 'C';
    else if (rec.overallPercentage >= 33) grade = 'D';
    rec.overallGrade = rec.hasAnyMarks ? grade : '—';
    return rec;
  });

  // Enrollment map for rolls
  const enrollMap = new Map();
  validEnrollments.forEach(e => {
    enrollMap.set(String(e.student), typeof e.toJSON === 'function' ? e.toJSON() : e);
  });

  studentList.sort((a, b) => {
    if (a.hasAnyMarks && !b.hasAnyMarks) return -1;
    if (!a.hasAnyMarks && b.hasAnyMarks) return 1;
    if (b.grandTotalObtained !== a.grandTotalObtained) {
      return b.grandTotalObtained - a.grandTotalObtained;
    }
    const rollA = parseInt(enrollMap.get(a.studentId)?.rollNumber) || 999;
    const rollB = parseInt(enrollMap.get(b.studentId)?.rollNumber) || 999;
    return rollA - rollB;
  });

  // Assign Shared Rankings
  let currentRank = 1;
  let prevTotal = null;
  let studentsWithMarksCount = 0;

  const rankedList = studentList.map((item) => {
    if (!item.hasAnyMarks) {
      return {
        ...item,
        rank: null,
        rankText: 'অনুপস্থিত'
      };
    }

    studentsWithMarksCount += 1;
    if (prevTotal !== null && item.grandTotalObtained === prevTotal) {
      // Shared Rank
    } else {
      currentRank = studentsWithMarksCount;
      prevTotal = item.grandTotalObtained;
    }

    const rankNum = currentRank;
    const isTie = studentList.filter(s => s.hasAnyMarks && s.grandTotalObtained === item.grandTotalObtained).length > 1;

    let rankText = '';
    if (rankNum === 1) rankText = isTie ? '🥇 ১ম স্থান (যৌথ)' : '🥇 ১ম স্থান';
    else if (rankNum === 2) rankText = isTie ? '🥈 ২য় স্থান (যৌথ)' : '🥈 ২য় স্থান';
    else if (rankNum === 3) rankText = isTie ? '🥉 ৩য় স্থান (যৌথ)' : '🥉 ৩য় স্থান';
    else if (rankNum === 4) rankText = isTie ? '৪র্থ (যৌথ)' : '৪র্থ';
    else if (rankNum === 5) rankText = isTie ? '৫ম (যৌথ)' : '৫ম';
    else if (rankNum === 6) rankText = isTie ? '৬ষ্ঠ (যৌথ)' : '৬ষ্ঠ';
    else if (rankNum === 7) rankText = isTie ? '৭ম (যৌথ)' : '৭ম';
    else if (rankNum === 8) rankText = isTie ? '৮ম (যৌথ)' : '৮ম';
    else if (rankNum === 9) rankText = isTie ? '৯ম (যৌথ)' : '৯ম';
    else if (rankNum === 10) rankText = isTie ? '১০ম (যৌথ)' : '১০ম';
    else rankText = isTie ? `${rankNum}তম (যৌথ)` : `${rankNum}তম`;

    return {
      ...item,
      rank: rankNum,
      rankText,
      isTie
    };
  });

  return {
    termExams: {
      term1: term1Exam ? { _id: term1Exam._id, name: term1Exam.name } : null,
      term2: term2Exam ? { _id: term2Exam._id, name: term2Exam.name } : null,
      term3: term3Exam ? { _id: term3Exam._id, name: term3Exam.name } : null,
    },
    rankings: rankedList,
    totalStudents: studentList.length,
    enrollMap
  };
}

// @desc    বার্ষিক সমন্বিত মেধা তালিকা (Combined Cumulative Annual Merit List)
// @route   GET /api/v1/exams/annual-rankings
exports.getAnnualCombinedRankings = async (req, res, next) => {
  try {
    let { classLevel, section } = req.query;

    // Enforce class scoping for student and guardian
    if (req.user.userType === 'student') {
      const Student = require('../models/Student');
      const StudentEnrollment = require('../models/StudentEnrollment');
      let studentDoc = await Student.findOne({ where: { user: req.user._id, isDeleted: false } }) || await Student.findOne({ user: req.user._id });
      let studentClassId = null;
      if (studentDoc && studentDoc.currentEnrollment) {
        const enr = await StudentEnrollment.findById(studentDoc.currentEnrollment);
        if (enr && enr.classLevel) studentClassId = typeof enr.classLevel === 'object' ? String(enr.classLevel._id) : String(enr.classLevel);
      }
      if (!studentClassId && studentDoc) {
        const enr = await StudentEnrollment.findOne({ where: { student: studentDoc._id, enrollmentStatus: 'active' } }) || await StudentEnrollment.findOne({ student: studentDoc._id, enrollmentStatus: 'active' });
        if (enr && enr.classLevel) studentClassId = typeof enr.classLevel === 'object' ? String(enr.classLevel._id) : String(enr.classLevel);
      }
      if (!studentClassId) {
        return ApiResponse.forbidden(res, 'আপনার শ্রেণি নির্ধারিত হয়নি');
      }
      classLevel = studentClassId;
    } else if (req.user.userType === 'guardian') {
      const Guardian = require('../models/Guardian');
      const Student = require('../models/Student');
      const StudentEnrollment = require('../models/StudentEnrollment');
      let guardianDoc = req.user.profileId ? await Guardian.findById(req.user.profileId) : await Guardian.findOne({ user: req.user._id });
      const linkedStudentIds = guardianDoc && guardianDoc.students ? guardianDoc.students.map(s => String(s.student)) : [];
      if (linkedStudentIds.length === 0) {
        return ApiResponse.forbidden(res, 'কোনো শিক্ষার্থী লিঙ্ক করা নেই');
      }
      const sDocs = await Student.findAll({ where: { _id: linkedStudentIds } });
      const enrollIds = sDocs.map(s => s.currentEnrollment).filter(Boolean);
      let classIds = [];
      if (enrollIds.length > 0) {
        const enrolls = await StudentEnrollment.findAll({ where: { _id: enrollIds } });
        classIds.push(...enrolls.map(e => String(e.classLevel)).filter(Boolean));
      }
      const activeEnrolls = await StudentEnrollment.findAll({ where: { student: linkedStudentIds, enrollmentStatus: 'active' } });
      classIds.push(...activeEnrolls.map(e => String(e.classLevel)).filter(Boolean));
      classIds = [...new Set(classIds)];

      if (classIds.length === 0) {
        return ApiResponse.forbidden(res, 'শিক্ষার্থীর শ্রেণি পাওয়া যায়নি');
      }
      if (!classLevel || !classIds.includes(String(classLevel))) {
        classLevel = classIds[0];
      }
    }

    if (!classLevel) {
      return ApiResponse.error(res, 'শ্রেণি নির্বাচন আবশ্যক', 400);
    }

    const ClassLevel = require('../models/ClassLevel');
    const classDoc = await ClassLevel.findById(classLevel);
    if (!classDoc) {
      return ApiResponse.notFound(res, 'শ্রেণি পাওয়া যায়নি');
    }

    const { termExams, rankings, totalStudents, enrollMap } = await calculateAnnualCombinedRanks(
      classLevel,
      req.user.institution,
      section
    );

    const studentIds = rankings.map(r => r.studentId);
    const Student = require('../models/Student');
    const User = require('../models/User');

    const students = await Student.findAll({
      where: {
        _id: studentIds,
        institution: req.user.institution,
        isDeleted: false
      }
    });

    const userIds = students.map(s => s.user).filter(Boolean);
    const users = userIds.length > 0 ? await User.findAll({ where: { _id: userIds } }) : [];
    const userMap = new Map();
    users.forEach(u => userMap.set(String(u._id), u));

    const sMap = new Map();
    students.forEach(s => {
      const uDoc = userMap.get(String(s.user));
      const fullName = uDoc ? (uDoc.fullName || `${uDoc.firstName || ''} ${uDoc.lastName || ''}`.trim()) : '';
      sMap.set(String(s._id), {
        ...(typeof s.toJSON === 'function' ? s.toJSON() : s),
        name: fullName || s.studentId || 'শিক্ষার্থী'
      });
    });

    const validRankings = rankings.filter(r => sMap.has(r.studentId));
    const formattedRankings = validRankings.map(r => {
      const sDoc = sMap.get(r.studentId);
      const enr = enrollMap.get(r.studentId);

      return {
        ...r,
        studentCode: sDoc?.studentId || '',
        name: sDoc?.name || 'শিক্ষার্থী',
        rollNumber: enr?.rollNumber || '',
        section: enr?.section || '',
        branch: sDoc?.branch || enr?.branch || ''
      };
    });

    ApiResponse.success(res, {
      classLevel: {
        _id: classDoc._id,
        name: classDoc.name,
        code: classDoc.code
      },
      termExams,
      rankings: formattedRankings,
      totalStudents: validRankings.length
    });
  } catch (error) {
    next(error);
  }
};

// @desc    পরীক্ষার মেধা তালিকা ও পজিশন (Rankings View)
// @route   GET /api/v1/exams/:id/rankings
exports.getExamRankings = async (req, res, next) => {
  try {
    const exam = await Exam.findById(req.params.id).populate('classLevel', 'name');
    if (!exam) {
      return ApiResponse.notFound(res, 'পরীক্ষা পাওয়া যায়নি');
    }

    // Verify class scoping for student and guardian
    if (req.user.userType === 'student') {
      const Student = require('../models/Student');
      const StudentEnrollment = require('../models/StudentEnrollment');
      let studentDoc = await Student.findOne({ where: { user: req.user._id, isDeleted: false } }) || await Student.findOne({ user: req.user._id });
      let studentClassId = null;
      if (studentDoc && studentDoc.currentEnrollment) {
        const enr = await StudentEnrollment.findById(studentDoc.currentEnrollment);
        if (enr && enr.classLevel) studentClassId = typeof enr.classLevel === 'object' ? String(enr.classLevel._id) : String(enr.classLevel);
      }
      if (!studentClassId && studentDoc) {
        const enr = await StudentEnrollment.findOne({ where: { student: studentDoc._id, enrollmentStatus: 'active' } }) || await StudentEnrollment.findOne({ student: studentDoc._id, enrollmentStatus: 'active' });
        if (enr && enr.classLevel) studentClassId = typeof enr.classLevel === 'object' ? String(enr.classLevel._id) : String(enr.classLevel);
      }
      const examClassId = typeof exam.classLevel === 'object' ? String(exam.classLevel._id) : String(exam.classLevel);
      if (studentClassId && examClassId && studentClassId !== examClassId) {
        return ApiResponse.forbidden(res, 'অন্য শ্রেণির মেধা তালিকা দেখার অনুমতি নেই');
      }
    } else if (req.user.userType === 'guardian') {
      const Guardian = require('../models/Guardian');
      const Student = require('../models/Student');
      const StudentEnrollment = require('../models/StudentEnrollment');
      let guardianDoc = req.user.profileId ? await Guardian.findById(req.user.profileId) : await Guardian.findOne({ user: req.user._id });
      const linkedStudentIds = guardianDoc && guardianDoc.students ? guardianDoc.students.map(s => String(s.student)) : [];
      if (linkedStudentIds.length === 0) {
        return ApiResponse.forbidden(res, 'কোনো শিক্ষার্থী লিঙ্ক করা নেই');
      }
      const sDocs = await Student.findAll({ where: { _id: linkedStudentIds } });
      const enrollIds = sDocs.map(s => s.currentEnrollment).filter(Boolean);
      let classIds = [];
      if (enrollIds.length > 0) {
        const enrolls = await StudentEnrollment.findAll({ where: { _id: enrollIds } });
        classIds.push(...enrolls.map(e => String(e.classLevel)).filter(Boolean));
      }
      const activeEnrolls = await StudentEnrollment.findAll({ where: { student: linkedStudentIds, enrollmentStatus: 'active' } });
      classIds.push(...activeEnrolls.map(e => String(e.classLevel)).filter(Boolean));
      classIds = [...new Set(classIds)];

      const examClassId = typeof exam.classLevel === 'object' ? String(exam.classLevel._id) : String(exam.classLevel);
      if (classIds.length > 0 && examClassId && !classIds.includes(examClassId)) {
        return ApiResponse.forbidden(res, 'আপনার সন্তানের শ্রেণি ছাড়া অন্য শ্রেণির মেধা তালিকা দেখার অনুমতি নেই');
      }
    }

    const { sortedList, distinctSubjectIds } = await calculateExamRanks(exam._id, req.user.institution);

    // Fetch subjects that have marks entered for this exam
    const Subject = require('../models/Subject');
    let evaluatedSubjects = [];
    if (distinctSubjectIds && distinctSubjectIds.length > 0) {
      evaluatedSubjects = await Subject.find({
        _id: { $in: distinctSubjectIds },
        institution: req.user.institution
      });
    }

    // Filter evaluated subjects to ensure they belong to this exam's class
    if (exam.classLevel) {
      const targetClass = String(exam.classLevel?._id || exam.classLevel);
      evaluatedSubjects = evaluatedSubjects.filter(sub => {
        let list = sub.classLevels;
        if (typeof list === 'string') {
          try { list = JSON.parse(list); } catch(_) { list = []; }
        }
        if (!Array.isArray(list)) return false;
        return list.some(c => (typeof c === 'object' && c !== null ? String(c._id) : String(c)) === targetClass);
      });
    }

    const studentIds = sortedList.map(s => s.studentId);
    const Student = require('../models/Student');
    const User = require('../models/User');
    const StudentEnrollment = require('../models/StudentEnrollment');

    const students = await Student.findAll({
      where: {
        _id: studentIds,
        institution: req.user.institution,
        isDeleted: false
      }
    });

    const userIds = students.map(s => s.user).filter(Boolean);
    const users = userIds.length > 0 ? await User.findAll({ where: { _id: userIds } }) : [];
    const userMap = new Map();
    users.forEach(u => userMap.set(String(u._id), u));

    const studentMap = new Map();
    students.forEach(s => {
      const uDoc = userMap.get(String(s.user));
      const fullName = uDoc ? (uDoc.fullName || `${uDoc.firstName || ''} ${uDoc.lastName || ''}`.trim()) : '';
      studentMap.set(String(s._id), {
        ...(typeof s.toJSON === 'function' ? s.toJSON() : s),
        name: fullName || s.studentId || 'শিক্ষার্থী'
      });
    });

    const enrollments = await StudentEnrollment.findAll({
      where: {
        student: studentIds,
        institution: req.user.institution
      }
    });
    const enrollMap = new Map();
    enrollments.forEach(e => enrollMap.set(String(e.student), e));

    let currentRank = 1;
    let prevTotal = null;

    const validSortedList = sortedList.filter(item => studentMap.has(item.studentId));

    const rankings = validSortedList.map((item, index) => {
      const sDoc = studentMap.get(item.studentId);
      const enr = enrollMap.get(item.studentId);
      if (prevTotal !== null && item.totalObtained === prevTotal) {
        // Shared rank
      } else {
        currentRank = index + 1;
        prevTotal = item.totalObtained;
      }

      const pct = item.totalMaxMarks > 0 ? Number(((item.totalObtained / item.totalMaxMarks) * 100).toFixed(1)) : 0;
      let grade = 'F';
      if (pct >= 80) grade = 'A+';
      else if (pct >= 70) grade = 'A';
      else if (pct >= 60) grade = 'A-';
      else if (pct >= 50) grade = 'B';
      else if (pct >= 40) grade = 'C';
      else if (pct >= 33) grade = 'D';

      return {
        rank: currentRank,
        studentId: item.studentId,
        studentCode: sDoc?.studentId || '',
        name: sDoc?.name || 'শিক্ষার্থী',
        rollNumber: enr?.rollNumber || '',
        section: enr?.section || '',
        branch: sDoc?.branch || enr?.branch || '',
        subjectMarks: item.subjectMarks || {},
        totalObtained: item.totalObtained,
        totalMaxMarks: item.totalMaxMarks,
        percentage: pct,
        grade,
        isIncomplete: evaluatedSubjects.length > 0 && (item.marksCount < evaluatedSubjects.length)
      };
    });

    ApiResponse.success(res, {
      exam: {
        _id: exam._id,
        name: exam.name,
        examCategory: exam.examCategory,
        termNumber: exam.termNumber,
        month: exam.month,
        className: exam.classLevel?.name || ''
      },
      evaluatedSubjects: evaluatedSubjects.map(s => ({
        _id: s._id,
        name: s.name,
        code: s.code,
        totalMarks: Number(s.totalMarks) || 100
      })),
      rankings
    });
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
