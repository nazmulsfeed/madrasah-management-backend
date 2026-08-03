const Guardian = require('../models/Guardian');
const User = require('../models/User');
const ApiResponse = require('../utils/apiResponse');

// @desc    সকল অভিভাবক তালিকা
// @route   GET /api/v1/guardians
exports.getGuardians = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 25;
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.user.institution) filter.institution = req.user.institution;
    if (req.query.status) filter.status = req.query.status;

    const total = await Guardian.countDocuments(filter);
    const guardians = await Guardian.find(filter)
      .populate('user', 'firstName lastName email phone photo')
      .populate({
        path: 'students.student',
        select: 'studentId photo user',
        populate: {
          path: 'user',
          select: 'firstName lastName'
        }
      })
      .skip(skip)
      .limit(limit);

    ApiResponse.paginated(res, guardians, page, limit, total);
  } catch (error) {
    next(error);
  }
};

// @desc    অভিভাবক বিস্তারিত
// @route   GET /api/v1/guardians/:id
exports.getGuardian = async (req, res, next) => {
  try {
    const guardian = await Guardian.findById(req.params.id)
      .populate('user', 'firstName lastName email phone photo')
      .populate({
        path: 'students.student',
        select: 'studentId photo user',
        populate: {
          path: 'user',
          select: 'firstName lastName'
        }
      });

    if (!guardian) {
      return ApiResponse.notFound(res, 'অভিভাবক পাওয়া যায়নি');
    }

    ApiResponse.success(res, { guardian });
  } catch (error) {
    next(error);
  }
};

// @desc    নতুন অভিভাবক তৈরি
// @route   POST /api/v1/guardians
exports.createGuardian = async (req, res, next) => {
  try {
    const { 
      firstName, lastName, email, phone, password, username,
      guardianId, occupation, nationalId, relationshipLabel, students
    } = req.body;

    let finalGuardianId = guardianId;
    if (!finalGuardianId || finalGuardianId.trim() === '') {
      const count = await Guardian.countDocuments(req.user.institution ? { institution: req.user.institution } : {});
      const year = new Date().getFullYear();
      finalGuardianId = `GRD-${year}-${10001 + count}`;
    }

    const finalEmail = email && email.trim() !== '' ? email.trim().toLowerCase() : undefined;
    const finalUsername = username && username.trim() !== '' ? username.trim() : `guardian_${finalGuardianId.replace(/-/g, '_').toLowerCase()}`;

    // 1. Create User
    const userFields = {
      firstName,
      lastName,
      phone: phone || '',
      password: password || 'guardian123',
      userType: 'guardian',
      institution: req.user.institution,
      branch: req.user.branch,
      isActive: true
    };
    if (finalEmail) userFields.email = finalEmail;
    if (finalUsername) userFields.username = finalUsername;

    const user = await User.create(userFields);

    // 2. Create Guardian profile
    const guardian = await Guardian.create({
      user: user._id,
      institution: req.user.institution,
      branch: req.user.branch,
      guardianId: finalGuardianId,
      occupation,
      nationalId: (nationalId && nationalId.trim() !== '') ? nationalId.trim() : undefined,
      relationshipLabel,
      students: students || [],
      status: 'active'
    });

    ApiResponse.created(res, { guardian }, 'অভিভাবক সফলভাবে যোগ করা হয়েছে');
  } catch (error) {
    next(error);
  }
};

// @desc    অভিভাবক ডিলিট
// @route   DELETE /api/v1/guardians/:id
exports.deleteGuardian = async (req, res, next) => {
  try {
    const guardian = await Guardian.findById(req.params.id);
    if (!guardian) {
      return ApiResponse.notFound(res, 'অভিভাবক পাওয়া যায়নি');
    }
    // Delete corresponding user
    if (guardian.user) {
      await User.findByIdAndDelete(guardian.user);
    }
    // Delete guardian
    await Guardian.findByIdAndDelete(req.params.id);

    ApiResponse.success(res, null, 'অভিভাবক সফলভাবে ডিলিট করা হয়েছে');
  } catch (error) {
    next(error);
  }
};

// @desc    অভিভাবক আপডেট
// @route   PATCH /api/v1/guardians/:id
exports.updateGuardian = async (req, res, next) => {
  try {
    const guardian = await Guardian.findById(req.params.id);
    if (!guardian) {
      return ApiResponse.notFound(res, 'অভিভাবক পাওয়া যায়নি');
    }

    // Update User
    const userDoc = await User.findById(guardian.user).select('+password');
    if (userDoc) {
      if (req.body.firstName !== undefined) userDoc.firstName = req.body.firstName;
      if (req.body.lastName !== undefined) userDoc.lastName = req.body.lastName;
      if (req.body.phone !== undefined) userDoc.phone = req.body.phone;

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

    // Update Guardian fields
    const allowedFields = ['guardianId', 'occupation', 'nationalId', 'relationshipLabel', 'status', 'students'];
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        if (field === 'nationalId') {
          guardian.nationalId = (req.body.nationalId && req.body.nationalId.trim() !== '') ? req.body.nationalId.trim() : undefined;
        } else {
          guardian[field] = req.body[field];
        }
      }
    });

    await guardian.save();

    const updated = await Guardian.findById(req.params.id)
      .populate('user', 'firstName lastName email phone photo')
      .populate({
        path: 'students.student',
        select: 'studentId photo user',
        populate: {
          path: 'user',
          select: 'firstName lastName'
        }
      });

    ApiResponse.success(res, { guardian: updated }, 'অভিভাবকের তথ্য আপডেট করা হয়েছে');
  } catch (error) {
    next(error);
  }
};
