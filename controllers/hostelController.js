const Hostel = require('../models/Hostel');
const ApiResponse = require('../utils/apiResponse');

// @desc    সকল হোস্টেল তালিকা
// @route   GET /api/v1/hostels
exports.getHostels = async (req, res, next) => {
  try {
    const filter = { institution: req.user.institution };
    if (req.query.status) filter.status = req.query.status;
    if (req.query.type) filter.type = req.query.type;

    const hostels = await Hostel.find(filter)
      .populate('createdBy', 'firstName lastName fullName')
      .sort({ createdAt: -1 });

    ApiResponse.success(res, { hostels });
  } catch (error) {
    next(error);
  }
};

// @desc    নতুন হোস্টেল তৈরি
// @route   POST /api/v1/hostels
exports.createHostel = async (req, res, next) => {
  try {
    const { name, type, capacity, rooms, address, description } = req.body;

    if (!name) {
      return ApiResponse.error(res, 'হোস্টেলের নাম আবশ্যক', 400);
    }

    const hostel = await Hostel.create({
      institution: req.user.institution,
      name,
      type: type || 'ছাত্র',
      capacity: capacity || 0,
      rooms: rooms || 0,
      address: address || '',
      description: description || '',
      createdBy: req.user._id,
    });

    const populated = await Hostel.findById(hostel._id)
      .populate('createdBy', 'firstName lastName fullName');

    ApiResponse.created(res, { hostel: populated }, 'হোস্টেল সফলভাবে তৈরি হয়েছে');
  } catch (error) {
    next(error);
  }
};

// @desc    হোস্টেল আপডেট
// @route   PATCH /api/v1/hostels/:id
exports.updateHostel = async (req, res, next) => {
  try {
    const hostel = await Hostel.findOne({
      _id: req.params.id,
      institution: req.user.institution,
    });

    if (!hostel) {
      return ApiResponse.notFound(res, 'হোস্টেল পাওয়া যায়নি');
    }

    const { name, type, capacity, rooms, address, description, status } = req.body;
    if (name !== undefined) hostel.name = name;
    if (type !== undefined) hostel.type = type;
    if (capacity !== undefined) hostel.capacity = capacity;
    if (rooms !== undefined) hostel.rooms = rooms;
    if (address !== undefined) hostel.address = address;
    if (description !== undefined) hostel.description = description;
    if (status !== undefined) hostel.status = status;

    await hostel.save();

    const populated = await Hostel.findById(hostel._id)
      .populate('createdBy', 'firstName lastName fullName');

    ApiResponse.success(res, { hostel: populated || hostel }, 'হোস্টেল সফলভাবে আপডেট করা হয়েছে');
  } catch (error) {
    next(error);
  }
};

// @desc    হোস্টেল মুছে ফেলা
// @route   DELETE /api/v1/hostels/:id
exports.deleteHostel = async (req, res, next) => {
  try {
    const hostel = await Hostel.findOne({
      _id: req.params.id,
      institution: req.user.institution,
    });

    if (!hostel) {
      return ApiResponse.notFound(res, 'হোস্টেল পাওয়া যায়নি');
    }

    await hostel.destroy();

    ApiResponse.success(res, null, 'হোস্টেল সফলভাবে মুছে ফেলা হয়েছে');
  } catch (error) {
    next(error);
  }
};

const DAY_ORDER = ['saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

// @desc    খাবার রুটিন দেখা (Weekly Meal Routine)
// @route   GET /api/v1/hostels/meal-routine
exports.getMealRoutines = async (req, res, next) => {
  try {
    const MealRoutine = require('../models/MealRoutine');
    const institution = req.user.institution;

    // Check student access: only residential students are allowed
    if (req.user.userType === 'student') {
      let isResidential = req.user.residentialStatus === 'residential' || req.user.residentialStatus === 'আবাসিক';
      if (!isResidential && req.user._id) {
        const Student = require('../models/Student');
        const student = await Student.findOne({ where: { userId: req.user._id } });
        if (student && (student.residentialStatus === 'residential' || student.residentialStatus === 'আবাসিক')) {
          isResidential = true;
        }
      }
      if (!isResidential) {
        return ApiResponse.forbidden(res, 'খাবার রুটিন শুধুমাত্র আবাসিক শিক্ষার্থীদের জন্য প্রযোজ্য');
      }
    }

    let routines = await MealRoutine.findAll({
      where: institution ? { institution } : {},
      raw: true
    });

    // If records are empty or incomplete, prepare 7-day default structure
    const existingDays = new Set((routines || []).map(r => r.dayOfWeek?.toLowerCase()));
    const missingDays = DAY_ORDER.filter(d => !existingDays.has(d));

    if (missingDays.length > 0 && institution) {
      for (const day of missingDays) {
        await MealRoutine.create({
          institution,
          dayOfWeek: day,
          breakfast: '',
          lunch: '',
          snacks: '',
          dinner: '',
          specialNote: '',
          updatedBy: req.user._id
        }).catch(() => {});
      }
      routines = await MealRoutine.findAll({
        where: institution ? { institution } : {},
        raw: true
      });
    }

    // Sort according to DAY_ORDER
    routines.sort((a, b) => {
      const idxA = DAY_ORDER.indexOf((a.dayOfWeek || '').toLowerCase());
      const idxB = DAY_ORDER.indexOf((b.dayOfWeek || '').toLowerCase());
      return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
    });

    ApiResponse.success(res, { routines });
  } catch (error) {
    next(error);
  }
};

// @desc    খাবার রুটিন সংরক্ষণ বা আপডেট (Authorities)
// @route   POST /api/v1/hostels/meal-routine
exports.saveMealRoutines = async (req, res, next) => {
  try {
    const MealRoutine = require('../models/MealRoutine');
    const institution = req.user.institution;

    // Authority permission check: all authorities can view and edit
    const authorityRoles = [
      'super_admin', 'co_super_admin', 'admin', 'principal', 
      'vice_principal', 'teacher', 'hifz_teacher', 'hostel_manager'
    ];
    const isAuthority = authorityRoles.includes(req.user.userType) ||
                        authorityRoles.includes(req.user.adminRole) ||
                        Boolean(req.user.can_manage_hostel);

    if (!isAuthority) {
      return ApiResponse.forbidden(res, 'খাবার রুটিন সম্পাদনা করার অনুমতি আপনার নেই');
    }

    const { routines } = req.body;

    if (!Array.isArray(routines) || routines.length === 0) {
      return ApiResponse.error(res, 'রুটিনের তথ্য প্রদান আবশ্যক', 400);
    }

    for (const r of routines) {
      if (!r.dayOfWeek) continue;
      const day = String(r.dayOfWeek).toLowerCase();
      
      const existing = await MealRoutine.findOne({
        where: { institution, dayOfWeek: day }
      });

      if (existing) {
        await existing.update({
          breakfast: r.breakfast || '',
          lunch: r.lunch || '',
          snacks: r.snacks || '',
          dinner: r.dinner || '',
          specialNote: r.specialNote || '',
          updatedBy: req.user._id
        });
      } else {
        await MealRoutine.create({
          institution,
          dayOfWeek: day,
          breakfast: r.breakfast || '',
          lunch: r.lunch || '',
          snacks: r.snacks || '',
          dinner: r.dinner || '',
          specialNote: r.specialNote || '',
          updatedBy: req.user._id
        });
      }
    }

    const updatedRoutines = await MealRoutine.findAll({
      where: institution ? { institution } : {},
      raw: true
    });

    updatedRoutines.sort((a, b) => {
      const idxA = DAY_ORDER.indexOf((a.dayOfWeek || '').toLowerCase());
      const idxB = DAY_ORDER.indexOf((b.dayOfWeek || '').toLowerCase());
      return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
    });

    ApiResponse.success(res, { routines: updatedRoutines }, 'খাবার রুটিন সফলভাবে আপডেট করা হয়েছে');
  } catch (error) {
    next(error);
  }
};
