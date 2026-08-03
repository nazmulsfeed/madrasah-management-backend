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
    const hostel = await Hostel.findOneAndUpdate(
      { _id: req.params.id, institution: req.user.institution },
      req.body,
      { new: true, runValidators: true }
    ).populate('createdBy', 'firstName lastName fullName');

    if (!hostel) {
      return ApiResponse.notFound(res, 'হোস্টেল পাওয়া যায়নি');
    }

    ApiResponse.success(res, { hostel }, 'হোস্টেল সফলভাবে আপডেট করা হয়েছে');
  } catch (error) {
    next(error);
  }
};

// @desc    হোস্টেল মুছে ফেলা
// @route   DELETE /api/v1/hostels/:id
exports.deleteHostel = async (req, res, next) => {
  try {
    const hostel = await Hostel.findOneAndDelete({
      _id: req.params.id,
      institution: req.user.institution,
    });

    if (!hostel) {
      return ApiResponse.notFound(res, 'হোস্টেল পাওয়া যায়নি');
    }

    ApiResponse.success(res, null, 'হোস্টেল সফলভাবে মুছে ফেলা হয়েছে');
  } catch (error) {
    next(error);
  }
};
