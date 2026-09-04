const Student = require('../models/Student');
const StudentEnrollment = require('../models/StudentEnrollment');
const User = require('../models/User');
const ClassLevel = require('../models/ClassLevel');
const Section = require('../models/Section');
const Subject = require('../models/Subject');
const AcademicYear = require('../models/AcademicYear');
const ApiResponse = require('../utils/apiResponse');

/**
 * Helper to ensure student currentEnrollment is deeply populated with classLevel, section, and academicYear
 */
async function populateStudentEnrollments(students) {
  if (!students) return [];
  const isArray = Array.isArray(students);
  const studentList = isArray ? students : [students];
  if (studentList.length === 0) return isArray ? [] : null;

  const enrollmentIds = [];
  const studentsNeedingLookup = [];

  for (const s of studentList) {
    const sObj = typeof s.toJSON === 'function' ? s.toJSON() : { ...s };
    const curEnrId = sObj.currentEnrollment && typeof sObj.currentEnrollment === 'object'
      ? sObj.currentEnrollment._id
      : sObj.currentEnrollment;

    if (curEnrId && typeof curEnrId === 'string' && curEnrId.trim() !== '') {
      enrollmentIds.push(curEnrId);
    } else if (sObj._id) {
      studentsNeedingLookup.push(sObj._id);
    }
  }

  let fallbackEnrollments = [];
  if (studentsNeedingLookup.length > 0) {
    fallbackEnrollments = await StudentEnrollment.findAll({
      where: {
        student: studentsNeedingLookup,
        enrollmentStatus: 'active'
      },
      order: [['createdAt', 'DESC']]
    });
  }

  const allEnrollmentIds = [
    ...new Set([
      ...enrollmentIds,
      ...fallbackEnrollments.map(e => e._id)
    ])
  ];

  let enrollments = [];
  if (allEnrollmentIds.length > 0) {
    enrollments = await StudentEnrollment.findAll({
      where: { _id: allEnrollmentIds }
    });
  }

  const classLevelIds = [...new Set(enrollments.map(e => e.classLevel).filter(Boolean))];
  const academicYearIds = [...new Set(enrollments.map(e => e.academicYear).filter(Boolean))];

  const [classes, years] = await Promise.all([
    classLevelIds.length > 0 ? ClassLevel.findAll({ where: { _id: classLevelIds } }) : [],
    academicYearIds.length > 0 ? AcademicYear.findAll({ where: { _id: academicYearIds } }) : []
  ]);

  const classMap = new Map();
  classes.forEach(c => {
    const cVal = typeof c.toJSON === 'function' ? c.toJSON() : c;
    classMap.set(cVal._id, cVal);
  });

  const yearMap = new Map();
  years.forEach(y => {
    const yVal = typeof y.toJSON === 'function' ? y.toJSON() : y;
    yearMap.set(yVal._id, yVal);
  });

  const enrollmentMap = new Map();
  const studentToEnrollmentMap = new Map();

  enrollments.forEach(e => {
    const eVal = typeof e.toJSON === 'function' ? e.toJSON() : e;
    const cl = classMap.get(eVal.classLevel);
    const ay = yearMap.get(eVal.academicYear);
    const secVal = eVal.section || '';

    const populatedEnr = {
      ...eVal,
      classLevel: cl ? {
        _id: cl._id,
        name: cl.name,
        code: cl.code,
        order: cl.order,
        monthlyFee: cl.monthlyFee,
        admissionFee: cl.admissionFee,
        sessionFee: cl.sessionFee,
        examFee: cl.examFee
      } : (eVal.classLevel ? { _id: eVal.classLevel, name: '' } : null),
      academicYear: ay ? {
        _id: ay._id,
        name: ay.name,
        isCurrent: ay.isCurrent
      } : (eVal.academicYear ? { _id: eVal.academicYear, name: '' } : null),
      section: {
        _id: secVal,
        name: secVal
      },
      rollNumber: eVal.rollNumber || ''
    };

    enrollmentMap.set(eVal._id, populatedEnr);
    if (!studentToEnrollmentMap.has(eVal.student)) {
      studentToEnrollmentMap.set(eVal.student, populatedEnr);
    }
  });

  const result = studentList.map(s => {
    const sObj = typeof s.toJSON === 'function' ? s.toJSON() : { ...s };
    const curEnrId = sObj.currentEnrollment && typeof sObj.currentEnrollment === 'object'
      ? sObj.currentEnrollment._id
      : sObj.currentEnrollment;

    let finalEnr = null;
    if (curEnrId && enrollmentMap.has(curEnrId)) {
      finalEnr = enrollmentMap.get(curEnrId);
    } else if (studentToEnrollmentMap.has(sObj._id)) {
      finalEnr = studentToEnrollmentMap.get(sObj._id);
      Student.update({ currentEnrollment: finalEnr._id }, { where: { _id: sObj._id } }).catch(() => {});
    }

    sObj.currentEnrollment = finalEnr;

    if (sObj.gender === 'পুরুষ') sObj.gender = 'male';
    else if (sObj.gender === 'মহিলা') sObj.gender = 'female';

    return sObj;
  });

  return isArray ? result : result[0];
}

// @desc    সকল ছাত্র/ছাত্রীর তালিকা
// @route   GET /api/v1/students
exports.getStudents = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 25;
    const skip = (page - 1) * limit;

    const filter = { isDeleted: { $ne: true } };

    if (req.user.institution) {
      filter.institution = req.user.institution;
    }
    if (req.user.userType === 'guardian') {
      const Guardian = require('../models/Guardian');
      const guardianDoc = await Guardian.findById(req.user.profileId);
      const studentIds = guardianDoc ? guardianDoc.students.map(s => s.student) : [];
      filter._id = { $in: studentIds };
    }
    if (req.query.status) {
      filter.status = req.query.status;
    }
    if (req.query.branch) {
      filter.branch = req.query.branch;
    }
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      filter.$or = [
        { admissionNumber: searchRegex },
        { studentId: searchRegex },
      ];
    }

    if (req.query.classLevel || req.query.section || req.query.sections || req.query.academicYear) {
      const enrollmentFilter = { institution: req.user.institution };
      if (req.query.classLevel && req.query.classLevel !== 'all') enrollmentFilter.classLevel = req.query.classLevel;
      if (req.query.academicYear) enrollmentFilter.academicYear = req.query.academicYear;
      if (req.query.branch) enrollmentFilter.branch = req.query.branch;

      // Section filtering (supports matching both section name and section ID)
      if (req.query.section && req.query.section !== 'all') {
        const targetSec = req.query.section.trim();
        const Section = require('../models/Section');
        const candidateValues = [targetSec];

        try {
          const matchedSections = await Section.find({
            institution: req.user.institution,
            $or: [
              { _id: targetSec },
              { name: targetSec },
              { name: { $regex: targetSec, $options: 'i' } }
            ]
          }).select('_id name');

          matchedSections.forEach(s => {
            if (s._id) candidateValues.push(s._id);
            if (s.name) candidateValues.push(s.name);
          });
        } catch (_) {}

        if (targetSec === 'কোন সেকশন নাই') {
          candidateValues.push('no_section', '', null);
        }

        enrollmentFilter.section = { $in: [...new Set(candidateValues)] };
      } else if (req.query.sections) {
        const secParts = req.query.sections.split(',').map(s => s.trim()).filter(Boolean);
        if (secParts.length > 0 && !secParts.includes('all')) {
          const Section = require('../models/Section');
          const candidateValues = [...secParts];
          try {
            const matchedSections = await Section.find({
              institution: req.user.institution,
              $or: [
                { _id: { $in: secParts } },
                { name: { $in: secParts } }
              ]
            }).select('_id name');

            matchedSections.forEach(s => {
              if (s._id) candidateValues.push(s._id);
              if (s.name) candidateValues.push(s.name);
            });
          } catch (_) {}

          if (secParts.includes('কোন সেকশন নাই')) {
            candidateValues.push('no_section', '', null);
          }

          enrollmentFilter.section = { $in: [...new Set(candidateValues)] };
        }
      }

      // Do not filter out enrollments if enrollmentStatus is null or active
      enrollmentFilter.enrollmentStatus = { $ne: 'inactive' };

      const enrollments = await StudentEnrollment.find(enrollmentFilter).select('student');
      const studentIds = enrollments.map((e) => e.student).filter(Boolean);
      filter._id = { $in: studentIds };
    }

    const total = await Student.countDocuments(filter);
    const students = await Student.find(filter)
      .populate('user', 'firstName lastName email phone photo fullName')
      .populate('institution', 'name code')
      .populate('branch', 'name code')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const populatedStudents = await populateStudentEnrollments(students);

    ApiResponse.paginated(res, populatedStudents, page, limit, total);
  } catch (error) {
    next(error);
  }
};

// @desc    ছাত্র বিস্তারিত
// @route   GET /api/v1/students/:id
exports.getStudent = async (req, res, next) => {
  try {
    const student = await Student.findById(req.params.id)
      .populate('user', 'firstName lastName email phone photo username fullName')
      .populate('institution', 'name code')
      .populate('branch', 'name code');

    if (!student) {
      return ApiResponse.notFound(res, 'ছাত্র/ছাত্রী পাওয়া যায়নি');
    }

    const populatedStudent = await populateStudentEnrollments(student);

    ApiResponse.success(res, { student: populatedStudent });
  } catch (error) {
    next(error);
  }
};

// @desc    নতুন ছাত্র/ছাত্রী তৈরি
// @route   POST /api/v1/students
exports.createStudent = async (req, res, next) => {
  try {
    const {
      firstName,
      lastName,
      username,
      email,
      phone,
      password,
      admissionNumber,
      studentId,
      classLevelId,
      sectionId,
      academicYearId,
      rollNumber,
      dateOfBirth,
      gender,
      bloodGroup,
      admissionDate,
      branchId,
      residentialStatus,
      hifzProgramType
    } = req.body;

    let finalAdmissionNumber = admissionNumber;
    if (!finalAdmissionNumber) {
      const count = await Student.countDocuments({ institution: req.user.institution });
      const year = new Date().getFullYear();
      finalAdmissionNumber = `ADM-${year}-${10001 + count}`;
    }

    let finalStudentId = studentId;
    if (!finalStudentId) {
      const count = await Student.countDocuments({ institution: req.user.institution });
      const year = new Date().getFullYear();
      finalStudentId = `ST-${year}-${10001 + count}`;
    }

    const finalUsername = username && username.trim() !== '' ? username.trim() : undefined;
    const finalEmail = email && email.trim() !== '' ? email.trim().toLowerCase() : undefined;

    // ব্যবহারকারী তৈরি
    const userFields = {
      password: password || 'madrasah123',
      firstName: firstName || '',
      lastName: lastName || '',
      phone: phone || '',
      userType: 'student',
      institution: req.user.institution,
      branch: branchId || req.user.branch,
    };
    if (finalUsername) userFields.username = finalUsername;
    if (finalEmail) userFields.email = finalEmail;

    const user = await User.create(userFields);

    // ছাত্র তৈরি
    const finalGender = (gender === 'female' || gender === 'মহিলা') ? 'female' : 'male';
    const student = await Student.create({
      user: user._id,
      institution: req.user.institution,
      branch: branchId || req.user.branch,
      admissionNumber: finalAdmissionNumber,
      studentId: finalStudentId,

      dateOfBirth: dateOfBirth || null,
      gender: finalGender,
      bloodGroup: bloodGroup || '',
      residentialStatus: residentialStatus || '',
      hifzProgramType: hifzProgramType || '',
      admissionDate: admissionDate || new Date(),
      createdBy: req.user._id,
    });

    // এনরোলমেন্ট তৈরি
    if (classLevelId && sectionId && academicYearId) {
      let finalRollNumber = rollNumber;
      if (!finalRollNumber) {
        const enrollments = await StudentEnrollment.find({
          institution: req.user.institution,
          academicYear: academicYearId,
          classLevel: classLevelId,
          section: sectionId,
        }).select('rollNumber');

        let maxRoll = 0;
        enrollments.forEach(e => {
          const num = parseInt(e.rollNumber, 10);
          if (!isNaN(num) && num > maxRoll) {
            maxRoll = num;
          }
        });
        finalRollNumber = String(maxRoll + 1);
      }

      const enrollment = await StudentEnrollment.create({
        student: student._id,
        institution: req.user.institution,
        branch: branchId || req.user.branch,
        academicYear: academicYearId,
        classLevel: classLevelId,
        section: sectionId,
        rollNumber: String(finalRollNumber),
        startDate: admissionDate || new Date(),
        createdBy: req.user._id,
      });

      student.currentEnrollment = enrollment._id;
      await student.save();
      await Student.update(
        { currentEnrollment: enrollment._id },
        { where: { _id: student._id } }
      );
    }

    const rawStudent = await Student.findById(student._id)
      .populate('user', 'firstName lastName email phone fullName')
      .populate('institution', 'name code')
      .populate('branch', 'name code');

    const populatedStudent = await populateStudentEnrollments(rawStudent);

    ApiResponse.created(res, { student: populatedStudent }, 'ছাত্র/ছাত্রী সফলভাবে তৈরি হয়েছে');
  } catch (error) {
    next(error);
  }
};

// @desc    ছাত্র আপডেট
// @route   PATCH /api/v1/students/:id
exports.updateStudent = async (req, res, next) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return ApiResponse.notFound(res, 'ছাত্র/ছাত্রী পাওয়া যায়নি');
    }

    // Update User fields — always select +password so pre-save hash hook works
    const userDoc = await User.findById(student.user).select('+password');
    if (userDoc) {
      if (req.body.firstName !== undefined) userDoc.firstName = req.body.firstName;
      if (req.body.lastName !== undefined) userDoc.lastName = req.body.lastName;
      if (req.body.phone !== undefined) userDoc.phone = req.body.phone;

      // Only update password when a non-empty value is provided
      if (req.body.password && req.body.password.trim() !== '') {
        userDoc.password = req.body.password.trim();
      }

      // Username — sparse unique: use $unset to properly clear
      if (req.body.username !== undefined) {
        if (req.body.username && req.body.username.trim() !== '') {
          userDoc.username = req.body.username.trim();
        } else {
          await User.updateOne({ _id: userDoc._id }, { $unset: { username: 1 } });
          userDoc.set({ username: undefined });
        }
      }

      // Email — sparse unique: use $unset to properly clear
      if (req.body.email !== undefined) {
        if (req.body.email && req.body.email.trim() !== '') {
          userDoc.email = req.body.email.trim().toLowerCase();
        } else {
          await User.updateOne({ _id: userDoc._id }, { $unset: { email: 1 } });
          userDoc.set({ email: undefined });
        }
      }

      await userDoc.save();
    }

    const allowedFields = ['dateOfBirth', 'bloodGroup', 'status', 'photo', 'residentialStatus', 'hifzProgramType'];
    const updates = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    if (req.body.gender !== undefined) {
      const g = req.body.gender;
      updates.gender = (g === 'female' || g === 'মহিলা') ? 'female' : 'male';
    }

    // Academic enrollment updates (academicYear, classLevel, section, rollNumber)
    const { classLevelId, sectionId, academicYearId, rollNumber } = req.body;
    if (classLevelId || sectionId || academicYearId || (rollNumber !== undefined && rollNumber !== '')) {
      const enrUpdates = {};
      if (classLevelId) enrUpdates.classLevel = classLevelId;
      if (sectionId) enrUpdates.section = sectionId;
      if (academicYearId) enrUpdates.academicYear = academicYearId;
      if (rollNumber !== undefined && rollNumber !== '') enrUpdates.rollNumber = String(rollNumber);
      enrUpdates.updatedBy = req.user._id;

      if (student.currentEnrollment) {
        await StudentEnrollment.update(enrUpdates, { where: { _id: student.currentEnrollment } });
      } else {
        const newEnrollment = await StudentEnrollment.create({
          student: student._id,
          institution: req.user.institution,
          branch: student.branch || req.user.branch,
          academicYear: academicYearId || '',
          classLevel: classLevelId || '',
          section: sectionId || 'ক',
          rollNumber: rollNumber ? String(rollNumber) : '1',
          startDate: new Date(),
          createdBy: req.user._id,
        });
        updates.currentEnrollment = newEnrollment._id;
      }
    }

    if (req.body.branchId !== undefined) {
      const branchVal = req.body.branchId || null;
      updates.branch = branchVal;
      // Update User branch
      await User.findByIdAndUpdate(student.user, { branch: branchVal });
      // Update current Enrollment branch
      if (student.currentEnrollment) {
        await StudentEnrollment.findByIdAndUpdate(student.currentEnrollment, { branch: branchVal });
      }
    }

    updates.updatedBy = req.user._id;

    await Student.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });

    const rawUpdated = await Student.findById(req.params.id)
      .populate('user', 'firstName lastName email phone photo username fullName')
      .populate('institution', 'name code')
      .populate('branch', 'name code');

    const populatedUpdated = await populateStudentEnrollments(rawUpdated);

    ApiResponse.success(res, { student: populatedUpdated }, 'ছাত্র/ছাত্রীর তথ্য আপডেট হয়েছে');
  } catch (error) {
    next(error);
  }
};

// @desc    ছাত্র মুছে ফেলুন (soft delete)
// @route   DELETE /api/v1/students/:id
exports.deleteStudent = async (req, res, next) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return ApiResponse.notFound(res, 'ছাত্র/ছাত্রী পাওয়া যায়নি');
    }

    student.isDeleted = true;
    student.deletedAt = new Date();
    await student.save();

    ApiResponse.success(res, null, 'ছাত্র/ছাত্রী মুছে ফেলা হয়েছে');
  } catch (error) {
    next(error);
  }
};

// @desc    ড্যাশবোর্ডের জন্য সংক্ষিপ্ত তথ্য
// @route   GET /api/v1/students/stats
exports.getStudentStats = async (req, res, next) => {
  try {
    const filter = { isDeleted: { $ne: true } };
    if (req.user.institution) {
      filter.institution = req.user.institution;
    }

    const total = await Student.countDocuments({ ...filter });
    const active = await Student.countDocuments({ ...filter, status: 'active' });
    const inactive = await Student.countDocuments({ ...filter, status: 'inactive' });
    const graduated = await Student.countDocuments({ ...filter, status: 'graduated' });

    ApiResponse.success(res, {
      total,
      active,
      inactive,
      graduated,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    সকল শ্রেণির তালিকা
// @route   GET /api/v1/students/classes
exports.getClassLevels = async (req, res, next) => {
  try {
    const filter = {};
    if (req.user.institution) filter.institution = req.user.institution;
    
    const classes = await ClassLevel.find(filter).sort({ order: 1 });
    ApiResponse.success(res, { classes });
  } catch (error) {
    next(error);
  }
};

// @desc    নতুন শ্রেণি তৈরি
// @route   POST /api/v1/students/classes
exports.createClassLevel = async (req, res, next) => {
  try {
    const { name, code, order } = req.body;
    if (!name || !code) {
      return ApiResponse.error(res, 'শ্রেণির নাম এবং কোড আবশ্যক', 400);
    }
    const classLevel = await ClassLevel.create({
      institution: req.user.institution,
      name,
      code,
      order: order || 0
    });
    ApiResponse.created(res, { classLevel }, 'শ্রেণি সফলভাবে তৈরি করা হয়েছে');
  } catch (error) {
    next(error);
  }
};

// @desc    শ্রেণি আপডেট
// @route   PATCH /api/v1/students/classes/:id
exports.updateClassLevel = async (req, res, next) => {
  try {
    const classLevel = await ClassLevel.findOneAndUpdate(
      { _id: req.params.id, institution: req.user.institution },
      req.body,
      { new: true, runValidators: true }
    );
    if (!classLevel) {
      return ApiResponse.notFound(res, 'শ্রেণি পাওয়া যায়নি');
    }
    ApiResponse.success(res, { classLevel }, 'শ্রেণি সফলভাবে আপডেট করা হয়েছে');
  } catch (error) {
    next(error);
  }
};

// @desc    শ্রেণি মুছে ফেলা
// @route   DELETE /api/v1/students/classes/:id
exports.deleteClassLevel = async (req, res, next) => {
  try {
    const classLevel = await ClassLevel.findOneAndDelete({
      _id: req.params.id,
      institution: req.user.institution
    });
    if (!classLevel) {
      return ApiResponse.notFound(res, 'শ্রেণি পাওয়া যায়নি');
    }
    // Also remove references to this class level from all subjects
    await Subject.updateMany(
      { institution: req.user.institution },
      { $pull: { classLevels: req.params.id } }
    );
    ApiResponse.success(res, null, 'শ্রেণি সফলভাবে মুছে ফেলা হয়েছে');
  } catch (error) {
    next(error);
  }
};

// @desc    সকল সেকশনের তালিকা
// @route   GET /api/v1/students/sections
exports.getSections = async (req, res, next) => {
  try {
    const filter = {};
    if (req.user.institution) filter.institution = req.user.institution;
    if (req.query.classLevel) filter.classLevel = req.query.classLevel;

    const sections = await Section.find(filter).populate('classLevel', 'name');
    ApiResponse.success(res, { sections });
  } catch (error) {
    next(error);
  }
};

// @desc    সকল বিষয়ের তালিকা
// @route   GET /api/v1/students/subjects
exports.getSubjects = async (req, res, next) => {
  try {
    const filter = {};
    if (req.user.institution) filter.institution = req.user.institution;

    const subjects = await Subject.find(filter);
    
    let filteredSubjects = subjects;
    if (req.query.classLevel) {
      const targetClassLevel = req.query.classLevel;
      filteredSubjects = subjects.filter(sub => {
        let list = sub.classLevels;
        if (typeof list === 'string') {
          try { list = JSON.parse(list); } catch(_) { list = []; }
        }
        if (!Array.isArray(list) || list.length === 0) {
          return true; // general subject
        }
        return list.includes(targetClassLevel);
      });
    }

    const populatedSubjects = await Promise.all(filteredSubjects.map(async (sub) => {
      const subObj = sub.toJSON();
      let list = subObj.classLevels;
      if (typeof list === 'string') {
        try { list = JSON.parse(list); } catch(_) { list = []; }
      }
      if (Array.isArray(list) && list.length > 0) {
        const ClassLevel = require('../models/ClassLevel');
        const classes = await ClassLevel.findAll({
          where: { _id: list }
        });
        subObj.classLevels_populated = classes.map(c => ({ _id: c._id, name: c.name, code: c.code }));
        subObj.classLevels = subObj.classLevels_populated;
      } else {
        subObj.classLevels_populated = [];
        subObj.classLevels = [];
      }
      return subObj;
    }));

    ApiResponse.success(res, { subjects: populatedSubjects });
  } catch (error) {
    next(error);
  }
};

// @desc    নতুন বিষয় তৈরি
// @route   POST /api/v1/students/subjects
exports.createSubject = async (req, res, next) => {
  try {
    const { name, code, subjectType, isHifzSubject, classLevels } = req.body;

    if (!name) {
      return ApiResponse.error(res, 'বিষয়ের নাম আবশ্যক', 400);
    }

    const subject = await Subject.create({
      institution: req.user.institution,
      name,
      code,
      subjectType: subjectType || 'mandatory',
      isHifzSubject: !!isHifzSubject,
      classLevels: classLevels || [],
    });

    ApiResponse.created(res, { subject }, 'বিষয় সফলভাবে তৈরি হয়েছে');
  } catch (error) {
    next(error);
  }
};

// @desc    বিষয় আপডেট
// @route   PATCH /api/v1/students/subjects/:id
exports.updateSubject = async (req, res, next) => {
  try {
    const subject = await Subject.findOne({
      where: { _id: req.params.id, institution: req.user.institution }
    });

    if (!subject) {
      return ApiResponse.notFound(res, 'বিষয় পাওয়া যায়নি');
    }

    await subject.update(req.body);

    ApiResponse.success(res, { subject }, 'বিষয় সফলভাবে আপডেট করা হয়েছে');
  } catch (error) {
    next(error);
  }
};

// @desc    বিষয় মুছে ফেলা
// @route   DELETE /api/v1/students/subjects/:id
exports.deleteSubject = async (req, res, next) => {
  try {
    const subject = await Subject.findOne({
      where: { _id: req.params.id, institution: req.user.institution }
    });

    if (!subject) {
      return ApiResponse.notFound(res, 'বিষয় পাওয়া যায়নি');
    }

    await subject.destroy();

    ApiResponse.success(res, null, 'বিষয় সফলভাবে মুছে ফেলা হয়েছে');
  } catch (error) {
    next(error);
  }
};

// @desc    সকল শিক্ষাবর্ষের তালিকা
// @route   GET /api/v1/students/academic-years
exports.getAcademicYears = async (req, res, next) => {
  try {
    const AcademicYear = require('../models/AcademicYear');
    const academicYears = await AcademicYear.find({ institution: req.user.institution }).sort({ startDate: -1 });
    ApiResponse.success(res, { academicYears });
  } catch (error) {
    next(error);
  }
};

// @desc    নতুন শিক্ষাবর্ষ তৈরি
// @route   POST /api/v1/students/academic-years
exports.createAcademicYear = async (req, res, next) => {
  try {
    const AcademicYear = require('../models/AcademicYear');
    const { name, startDate, endDate, isCurrent } = req.body;
    if (!name || !startDate || !endDate) {
      return ApiResponse.error(res, 'শিক্ষাবর্ষের নাম, শুরু এবং শেষের তারিখ আবশ্যক', 400);
    }

    if (isCurrent) {
      await AcademicYear.updateMany(
        { institution: req.user.institution },
        { isCurrent: false }
      );
    }

    const academicYear = await AcademicYear.create({
      name,
      startDate,
      endDate,
      isCurrent: !!isCurrent,
      institution: req.user.institution,
      isActive: true
    });

    ApiResponse.created(res, { academicYear }, 'শিক্ষাবর্ষ সফলভাবে তৈরি করা হয়েছে');
  } catch (error) {
    next(error);
  }
};

// @desc    শিক্ষাবর্ষ আপডেট
// @route   PATCH /api/v1/students/academic-years/:id
exports.updateAcademicYear = async (req, res, next) => {
  try {
    const AcademicYear = require('../models/AcademicYear');
    const { name, startDate, endDate, isCurrent, isActive } = req.body;
    const academicYear = await AcademicYear.findById(req.params.id);

    if (!academicYear) {
      return ApiResponse.notFound(res, 'শিক্ষাবর্ষ পাওয়া যায়নি');
    }

    if (isCurrent) {
      await AcademicYear.updateMany(
        { institution: req.user.institution },
        { isCurrent: false }
      );
    }

    if (name !== undefined) academicYear.name = name;
    if (startDate !== undefined) academicYear.startDate = startDate;
    if (endDate !== undefined) academicYear.endDate = endDate;
    if (isCurrent !== undefined) academicYear.isCurrent = !!isCurrent;
    if (isActive !== undefined) academicYear.isActive = !!isActive;

    await academicYear.save();

    ApiResponse.success(res, { academicYear }, 'শিক্ষাবর্ষ সফলভাবে আপডেট করা হয়েছে');
  } catch (error) {
    next(error);
  }
};

// @desc    Hook to delete academic year
// @route   DELETE /api/v1/students/academic-years/:id
exports.deleteAcademicYear = async (req, res, next) => {
  try {
    const AcademicYear = require('../models/AcademicYear');
    const academicYear = await AcademicYear.findById(req.params.id);

    if (!academicYear) {
      return ApiResponse.notFound(res, 'শিক্ষাবর্ষ পাওয়া যায়নি');
    }

    await academicYear.deleteOne();
    ApiResponse.success(res, null, 'শিক্ষাবর্ষ সফলভাবে মুছে ফেলা হয়েছে');
  } catch (error) {
    next(error);
  }
};

// @desc    উত্তীর্ণকরণের সম্ভাব্য ছাত্র/ছাত্রীর তালিকা (উইথ মার্কস)
// @route   GET /api/v1/students/promotion-candidates
exports.getPromotionCandidates = async (req, res, next) => {
  try {
    const AcademicYear = require('../models/AcademicYear');
    const MarkEntry = require('../models/MarkEntry');
    const { academicYear, classLevel, section } = req.query;

    if (!academicYear || !classLevel) {
      return ApiResponse.error(res, 'শিক্ষাবর্ষ এবং শ্রেণি ফিল্টার আবশ্যক', 400);
    }

    const enrollmentFilter = {
      institution: req.user.institution,
      academicYear,
      classLevel,
      enrollmentStatus: 'active'
    };
    if (section) {
      enrollmentFilter.section = section;
    }

    const enrollments = await StudentEnrollment.find(enrollmentFilter)
      .populate({
        path: 'student',
        populate: { path: 'user', select: 'firstName lastName fullName email phone' }
      })
      .populate('section', 'name')
      .populate('classLevel', 'name');

    // For each enrollment, query their MarkEntries for this academicYear and calculate avg marks percentage
    const candidates = await Promise.all(
      enrollments.map(async (e) => {
        if (!e.student) return null;
        
        // Find mark entries for this student and this academic year
        const marks = await MarkEntry.find({
          student: e.student._id,
          academicYear: academicYear
        });

        let totalObtained = 0;
        let totalMarks = 0;
        marks.forEach((m) => {
          totalObtained += m.marksObtained || 0;
          totalMarks += m.totalMarks || 0;
        });

        const avgPercentage = totalMarks > 0 ? Math.round((totalObtained / totalMarks) * 100) : null;

        return {
          studentId: e.student._id,
          name: e.student.user ? (e.student.user.fullName || `${e.student.user.firstName || ''} ${e.student.user.lastName || ''}`.trim()) : 'অজানা',
          email: e.student.user?.email || '',
          admissionNumber: e.student.admissionNumber || '',
          rollNumber: e.rollNumber,
          enrollmentId: e._id,
          avgPercentage,
          marksCount: marks.length
        };
      })
    );

    // Filter out null candidates (if student doc was deleted)
    const validCandidates = candidates.filter(Boolean);

    ApiResponse.success(res, { candidates: validCandidates });
  } catch (error) {
    next(error);
  }
};

// @desc    ছাত্র/ছাত্রীদের শ্রেণি উত্তীর্ণ (Batch Promote) করুন
// @route   POST /api/v1/students/promote
exports.promoteStudents = async (req, res, next) => {
  try {
    const { promotions, destClassLevelId, destSectionId, destAcademicYearId } = req.body;

    if (!promotions || !Array.isArray(promotions) || promotions.length === 0) {
      return ApiResponse.error(res, 'উত্তীর্ণ করার জন্য শিক্ষার্থী নির্বাচন আবশ্যক', 400);
    }
    if (!destClassLevelId || !destSectionId || !destAcademicYearId) {
      return ApiResponse.error(res, 'গন্তব্য শিক্ষাবর্ষ, শ্রেণি এবং সেকশন আবশ্যক', 400);
    }

    const promotedCount = promotions.length;

    // Run in a sequential loop
    for (const p of promotions) {
      const { studentId, enrollmentId, rollNumber } = p;

      // 1. Update old active enrollment
      await StudentEnrollment.findByIdAndUpdate(enrollmentId, {
        enrollmentStatus: 'promoted',
        endDate: new Date(),
        updatedBy: req.user._id
      });

      // 2. Create new active enrollment
      const newEnrollment = await StudentEnrollment.create({
        student: studentId,
        institution: req.user.institution,
        branch: req.user.branch || null,
        academicYear: destAcademicYearId,
        classLevel: destClassLevelId,
        section: destSectionId,
        rollNumber: String(rollNumber),
        enrollmentStatus: 'active',
        startDate: new Date(),
        createdBy: req.user._id
      });

      // 3. Update Student currentEnrollment
      await Student.findByIdAndUpdate(studentId, {
        currentEnrollment: newEnrollment._id
      });
    }

    ApiResponse.success(res, null, `${promotedCount} জন শিক্ষার্থীকে সফলভাবে উত্তীর্ণ (Promote) করা হয়েছে`);
  } catch (error) {
    next(error);
  }
};

// @desc    পরবর্তী রোল নম্বর পান
// @route   GET /api/v1/students/next-roll
exports.getNextRollNumber = async (req, res, next) => {
  try {
    const { classLevelId, sectionId, academicYearId } = req.query;
    if (!classLevelId || !sectionId) {
      return ApiResponse.error(res, 'শ্রেণি এবং সেকশন আইডি আবশ্যক', 400);
    }

    let finalAcademicYearId = academicYearId;
    if (!finalAcademicYearId) {
      const AcademicYear = require('../models/AcademicYear');
      const activeYear = await AcademicYear.findOne({
        institution: req.user.institution,
        isCurrent: true
      });
      if (activeYear) {
        finalAcademicYearId = activeYear._id;
      }
    }

    if (!finalAcademicYearId) {
      return ApiResponse.success(res, { nextRollNumber: 1 });
    }

    const enrollments = await StudentEnrollment.find({
      institution: req.user.institution,
      academicYear: finalAcademicYearId,
      classLevel: classLevelId,
      section: sectionId,
    }).select('rollNumber');

    let maxRoll = 0;
    enrollments.forEach(e => {
      const num = parseInt(e.rollNumber, 10);
      if (!isNaN(num) && num > maxRoll) {
        maxRoll = num;
      }
    });

    ApiResponse.success(res, { nextRollNumber: maxRoll + 1 });
  } catch (error) {
    next(error);
  }
};

// @desc    সকল শাখার তালিকা (বালক, বালিকা, নুরানী ইত্যাদি)
// @route   GET /api/v1/students/branches
exports.getBranches = async (req, res, next) => {
  try {
    const Branch = require('../models/Branch');
    
    // Seed default branches if they don't exist for this institution
    const defaultBranchNames = [
      { name: 'বালক শাখা', code: 'BOYS' },
      { name: 'বালিকা শাখা', code: 'GIRLS' }
    ];

    let branches = await Branch.find({ institution: req.user.institution });

    let seededAny = false;
    for (const d of defaultBranchNames) {
      const exists = branches.find(b => b.code === d.code || b.name === d.name);
      if (!exists) {
        await Branch.create({
          institution: req.user.institution,
          name: d.name,
          code: d.code,
          isActive: true
        });
        seededAny = true;
      }
    }

    if (seededAny) {
      branches = await Branch.find({ institution: req.user.institution });
    }

    ApiResponse.success(res, { branches });
  } catch (error) {
    next(error);
  }
};

// @desc    শ্রেণি ভিত্তিক বিষয়ের ব্যাচ আপডেট
// @route   POST /api/v1/students/class-subjects
exports.updateClassSubjects = async (req, res, next) => {
  try {
    const { classLevelId, subjectIds } = req.body;

    if (!classLevelId || !Array.isArray(subjectIds)) {
      return ApiResponse.error(res, 'শ্রেণি আইডি এবং বিষয়ের তালিকা আবশ্যক', 400);
    }

    // 1. Remove this classLevelId from all subjects
    await Subject.updateMany(
      { institution: req.user.institution },
      { $pull: { classLevels: classLevelId } }
    );

    // 2. Add this classLevelId to all selected subjects
    if (subjectIds.length > 0) {
      await Subject.updateMany(
        { _id: { $in: subjectIds }, institution: req.user.institution },
        { $addToSet: { classLevels: classLevelId } }
      );
    }

    ApiResponse.success(res, null, 'শ্রেণি ভিত্তিক বিষয় সফলভাবে আপডেট করা হয়েছে');
  } catch (error) {
    next(error);
  }
};
