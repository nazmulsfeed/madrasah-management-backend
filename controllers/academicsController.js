const Institution = require('../models/Institution');
const ClassLevel = require('../models/ClassLevel');

// 1. Get Public Timetable
exports.getPublicTimetable = async (req, res, next) => {
  try {
    const institution = await Institution.findOne();
    let timetable = {};
    if (institution && institution.timetableData) {
      try {
        timetable = JSON.parse(institution.timetableData);
      } catch (_) {
        timetable = {};
      }
    }

    const classes = await ClassLevel.findAll({
      where: { status: 'active' },
      attributes: ['_id', 'name', 'code', 'numericOrOrder'],
      order: [['numericOrOrder', 'ASC']]
    });

    return res.status(200).json({
      success: true,
      data: {
        timetable,
        classes: classes.map(c => ({
          _id: c._id,
          name: c.name,
          code: c.code
        }))
      }
    });
  } catch (error) {
    console.error('Error in getPublicTimetable:', error);
    return res.status(500).json({
      success: false,
      message: 'ক্লাস রুটিন লোড করতে ব্যর্থ হয়েছে',
      error: error.message
    });
  }
};

// 2. Get Public Calendar
exports.getPublicCalendar = async (req, res, next) => {
  try {
    const institution = await Institution.findOne();
    let events = [];
    if (institution && institution.academicCalendarEvents) {
      try {
        events = JSON.parse(institution.academicCalendarEvents);
      } catch (_) {
        events = [];
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        events
      }
    });
  } catch (error) {
    console.error('Error in getPublicCalendar:', error);
    return res.status(500).json({
      success: false,
      message: 'একাডেমিক ক্যালেন্ডার লোড করতে ব্যর্থ হয়েছে',
      error: error.message
    });
  }
};

// 3. Save Timetable (Admin / Principal)
exports.saveTimetable = async (req, res, next) => {
  try {
    const { timetable } = req.body;
    const institution = await Institution.findOne();
    if (!institution) {
      return res.status(404).json({ success: false, message: 'প্রতিষ্ঠান পাওয়া যায়নি' });
    }

    institution.timetableData = JSON.stringify(timetable || {});
    await institution.save();

    return res.status(200).json({
      success: true,
      message: 'ক্লাস রুটিন সফলভাবে সংরক্ষিত হয়েছে',
      data: { timetable }
    });
  } catch (error) {
    console.error('Error in saveTimetable:', error);
    return res.status(500).json({
      success: false,
      message: 'ক্লাস রুটিন সংরক্ষণে ব্যর্থ হয়েছে',
      error: error.message
    });
  }
};

// 4. Save Calendar (Admin / Principal)
exports.saveCalendar = async (req, res, next) => {
  try {
    const { events } = req.body;
    const institution = await Institution.findOne();
    if (!institution) {
      return res.status(404).json({ success: false, message: 'প্রতিষ্ঠান পাওয়া যায়নি' });
    }

    institution.academicCalendarEvents = JSON.stringify(events || []);
    await institution.save();

    return res.status(200).json({
      success: true,
      message: 'একাডেমিক ক্যালেন্ডার সফলভাবে সংরক্ষিত হয়েছে',
      data: { events }
    });
  } catch (error) {
    console.error('Error in saveCalendar:', error);
    return res.status(500).json({
      success: false,
      message: 'একাডেমিক ক্যালেন্ডার সংরক্ষণে ব্যর্থ হয়েছে',
      error: error.message
    });
  }
};
