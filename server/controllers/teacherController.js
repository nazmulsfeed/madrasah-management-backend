const Teacher = require('../models/Teacher');
const User = require('../models/User');
const ApiResponse = require('../utils/apiResponse');

// @desc    সকল শিক্ষক তালিকা
// @route   GET /api/v1/teachers
exports.getTeachers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const staffTypes = [
      'principal', 'vice_principal', 'teacher', 'hifz_teacher', 
      'accountant', 'admission_officer', 'hostel_manager', 'library_manager'
    ];

    const userFilter = { userType: { $in: staffTypes } };
    if (req.user.institution) {
      userFilter.institution = req.user.institution;
    }

    const totalUsers = await User.countDocuments(userFilter);
    const users = await User.find(userFilter)
      .skip(skip)
      .limit(limit);

    const teachersList = [];

    for (const user of users) {
      let teacher = await Teacher.findOne({ user: user._id });
      if (!teacher) {
        // Automatically create a missing Teacher profile to sync data
        const year = new Date().getFullYear();
        const randomId = Math.floor(100 + Math.random() * 900);
        const employeeId = `STF-${year}-${randomId}-${user._id.toString().slice(-4)}`;
        
        teacher = await Teacher.create({
          user: user._id,
          institution: user.institution,
          branch: user.branch,
          employeeId,
          teacherType: user.userType === 'hifz_teacher' ? 'hifz' : 'regular',
          designation: user.userType === 'principal' ? 'প্রিন্সিপাল' : 
                       user.userType === 'vice_principal' ? 'ভাইস প্রিন্সিপাল' :
                       user.userType === 'accountant' ? 'হিসাবরক্ষক' :
                       user.userType === 'library_manager' ? 'লাইব্রেরি ম্যানেজার' :
                       user.userType === 'hostel_manager' ? 'হোস্টেল ম্যানেজার' : 'শিক্ষক',
          joiningDate: user.createdAt || new Date(),
          status: 'active'
        });

        // Link profileId back to User
        user.profileId = teacher._id;
        await user.save({ validateBeforeSave: false });
      }

      // Populate user manually
      const teacherObj = teacher.toObject();
      teacherObj.user = user;

      // Apply query filters
      if (req.query.teacherType && teacher.teacherType !== req.query.teacherType) {
        continue;
      }
      if (req.query.status && teacher.status !== req.query.status) {
        continue;
      }

      teachersList.push(teacherObj);
    }

    ApiResponse.paginated(res, teachersList, page, limit, totalUsers);
  } catch (error) {
    next(error);
  }
};

// @desc    শিক্ষক বিস্তারিত
// @route   GET /api/v1/teachers/:id
exports.getTeacher = async (req, res, next) => {
  try {
    const teacher = await Teacher.findById(req.params.id)
      .populate('user', 'firstName lastName email phone photo userType');

    if (!teacher) {
      return ApiResponse.notFound(res, 'শিক্ষক পাওয়া যায়নি');
    }

    ApiResponse.success(res, { teacher });
  } catch (error) {
    next(error);
  }
};

// @desc    নতুন শিক্ষক তৈরি (Admin Only)
// @route   POST /api/v1/teachers
exports.createTeacher = async (req, res, next) => {
  try {
    const { firstName, lastName, email, phone, password, username, teacherId, teacherType } = req.body;
    let finalTeacherId = teacherId;
    if (!finalTeacherId || finalTeacherId.trim() === '') {
      const count = await Teacher.countDocuments(req.user.institution ? { institution: req.user.institution } : {});
      const year = new Date().getFullYear();
      finalTeacherId = `TCH-${year}-${101 + count}`;
    }

    const finalEmail = email && email.trim() !== '' ? email.trim().toLowerCase() : undefined;
    const finalUsername = username && username.trim() !== '' ? username.trim() : `teacher_${finalTeacherId.replace(/-/g, '_').toLowerCase()}`;

    // 1. Create User
    const validUserTypes = [
      'principal', 'vice_principal', 'teacher', 'hifz_teacher', 
      'accountant', 'admission_officer', 'hostel_manager', 'library_manager'
    ];
    const requestedUserType = req.body.userType;
    const finalUserType = validUserTypes.includes(requestedUserType) ? requestedUserType : 'teacher';

    const userFields = {
      firstName: firstName || '',
      lastName: lastName || '',
      phone: phone || '',
      password: (password && password.trim() !== '') ? password.trim() : 'teacher123',
      userType: finalUserType,
      institution: req.user.institution,
      branch: req.user.branch,
      isActive: true
    };
    if (finalEmail) userFields.email = finalEmail;
    if (finalUsername) userFields.username = finalUsername;

    const user = await User.create(userFields);

    // 2. Create Teacher profile
    const teacher = await Teacher.create({
      user: user._id,
      institution: req.user.institution,
      branch: req.user.branch,
      employeeId: finalTeacherId, // required by schema
      teacherType: teacherType || (finalUserType === 'hifz_teacher' ? 'hifz' : 'regular'),
      designation: req.body.designation || '',
      joiningDate: req.body.joinDate || new Date(),
      qualification: req.body.qualifications || '',
      status: 'active'
    });

    // 3. Link profileId back to User
    user.profileId = teacher._id;
    await user.save({ validateBeforeSave: false });

    ApiResponse.created(res, { teacher }, 'স্টাফ/শিক্ষক সফলভাবে যোগ করা হয়েছে');
  } catch (error) {
    next(error);
  }
};

// @desc    শিক্ষক ডিলিট (Admin Only)
// @route   DELETE /api/v1/teachers/:id
exports.deleteTeacher = async (req, res, next) => {
  try {
    const teacher = await Teacher.findById(req.params.id);
    if (!teacher) {
      return ApiResponse.notFound(res, 'শিক্ষক/স্টাফ পাওয়া যায়নি');
    }
    // Delete corresponding user
    if (teacher.user) {
      await User.findByIdAndDelete(teacher.user);
    }
    // Delete teacher
    await Teacher.findByIdAndDelete(req.params.id);

    ApiResponse.success(res, null, 'শিক্ষক/স্টাফ সফলভাবে ডিলিট করা হয়েছে');
  } catch (error) {
    next(error);
  }
};

// @desc    শিক্ষক আপডেট (Admin Only)
// @route   PATCH /api/v1/teachers/:id
exports.updateTeacher = async (req, res, next) => {
  try {
    const teacher = await Teacher.findById(req.params.id);
    if (!teacher) {
      return ApiResponse.notFound(res, 'শিক্ষক/স্টাফ পাওয়া যায়নি');
    }

    // Update User
    const userDoc = await User.findById(teacher.user).select('+password');
    if (userDoc) {
      if (req.body.firstName !== undefined) userDoc.firstName = req.body.firstName;
      if (req.body.lastName !== undefined) userDoc.lastName = req.body.lastName;
      if (req.body.phone !== undefined) userDoc.phone = req.body.phone;

      const validUserTypes = [
        'principal', 'vice_principal', 'teacher', 'hifz_teacher', 
        'accountant', 'admission_officer', 'hostel_manager', 'library_manager'
      ];
      if (req.body.userType !== undefined && validUserTypes.includes(req.body.userType)) {
        userDoc.userType = req.body.userType;
      }

      if (req.body.username !== undefined) {
        if (req.body.username && req.body.username.trim() !== '') {
          userDoc.username = req.body.username.trim();
        } else {
          await User.updateOne({ _id: userDoc._id }, { $unset: { username: 1 } });
          userDoc.set({ username: undefined });
        }
      }

      if (req.body.email !== undefined) {
        if (req.body.email && req.body.email.trim() !== '') {
          userDoc.email = req.body.email.trim().toLowerCase();
        } else {
          await User.updateOne({ _id: userDoc._id }, { $unset: { email: 1 } });
          userDoc.set({ email: undefined });
        }
      }

      if (req.body.password && req.body.password.trim() !== '') {
        userDoc.password = req.body.password.trim();
      }
      await userDoc.save();
    }

    // Update Teacher profile
    if (req.body.teacherType !== undefined) teacher.teacherType = req.body.teacherType;
    if (req.body.designation !== undefined) teacher.designation = req.body.designation;
    if (req.body.qualification !== undefined) teacher.qualification = req.body.qualification;
    if (req.body.status !== undefined) teacher.status = req.body.status;
    if (req.body.teacherId !== undefined) teacher.employeeId = req.body.teacherId;

    await teacher.save();

    const updated = await Teacher.findById(req.params.id).populate('user', 'firstName lastName email phone photo userType');

    ApiResponse.success(res, { teacher: updated }, 'স্টাফ/শিক্ষকের তথ্য আপডেট করা হয়েছে');
  } catch (error) {
    next(error);
  }
};
// End of file

