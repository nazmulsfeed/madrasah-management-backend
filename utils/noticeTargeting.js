const { Op } = require('sequelize');
const Student = require('../models/Student');
const Guardian = require('../models/Guardian');
const Branch = require('../models/Branch');
const StudentEnrollment = require('../models/StudentEnrollment');

/**
 * Parse Notice.audience (supports legacy arrays like ['all'], ['student'] and
 * structured objects like { roles: ['student', 'guardian'], filters: {...} })
 */
function parseNoticeAudience(rawAudience) {
  let parsed = rawAudience;
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed);
    } catch (_) {
      parsed = [parsed];
    }
  }

  if (Array.isArray(parsed)) {
    const roles = parsed.map(r => normalizeRole(r)).filter(Boolean);
    return {
      roles: roles.length > 0 ? roles : ['all'],
      filters: {}
    };
  }

  if (parsed && typeof parsed === 'object') {
    const rawRoles = Array.isArray(parsed.roles) ? parsed.roles : (parsed.role ? [parsed.role] : ['student']);
    const roles = rawRoles.map(r => normalizeRole(r)).filter(Boolean);
    const filters = parsed.filters && typeof parsed.filters === 'object' ? parsed.filters : {};
    const userIds = Array.isArray(parsed.userIds) ? parsed.userIds.map(id => String(id)).filter(Boolean) : [];
    return {
      roles: roles.length > 0 ? roles : ['all'],
      filters,
      userIds
    };
  }

  return { roles: ['all'], filters: {}, userIds: [] };
}

function normalizeRole(r) {
  const val = String(r || '').trim().toLowerCase();
  if (val === 'students') return 'student';
  if (val === 'guardians') return 'guardian';
  if (val === 'teachers') return 'teacher';
  return val;
}

function hasActiveStudentFilters(filters) {
  if (!filters || typeof filters !== 'object') return false;
  return Boolean(
    filters.classLevel ||
    filters.section ||
    filters.branch ||
    filters.department ||
    filters.residentialStatus
  );
}

/**
 * Resolve effective classLevel & section for a student (handles both embedded JSON and enrollment ID)
 */
async function resolveStudentEnrollmentMap(students) {
  const map = new Map();
  const enrollmentIds = [];
  const missingStudentIds = [];

  for (const stu of students) {
    const sid = String(stu._id || stu.id);
    const ce = stu.currentEnrollment;
    if (ce && typeof ce === 'object') {
      const cls = ce.classLevel?._id || ce.classLevel || '';
      const sec = ce.section?.name || ce.section || '';
      map.set(sid, {
        classLevel: cls ? String(cls) : '',
        section: sec ? String(sec).trim() : '',
        department: ce.department || stu.department || ''
      });
    } else if (typeof ce === 'string' && ce.trim()) {
      enrollmentIds.push(ce.trim());
    } else {
      missingStudentIds.push(sid);
    }
  }

  if (enrollmentIds.length > 0 || missingStudentIds.length > 0) {
    const whereOr = [];
    if (enrollmentIds.length > 0) whereOr.push({ _id: { [Op.in]: enrollmentIds } });
    if (missingStudentIds.length > 0) whereOr.push({ student: { [Op.in]: missingStudentIds } });

    const enrollments = await StudentEnrollment.findAll({
      where: { [Op.or]: whereOr },
      order: [['createdAt', 'DESC']]
    });

    for (const enr of enrollments) {
      const sid = String(enr.student || '');
      if (sid && !map.has(sid)) {
        map.set(sid, {
          classLevel: enr.classLevel ? String(enr.classLevel) : '',
          section: enr.section ? String(enr.section).trim() : '',
          department: enr.department || ''
        });
      }
    }
  }

  return map;
}

/**
 * Expand a selected branch ID into all matching branch IDs (including dual '+ নুরানী' branches)
 */
function getMatchingBranchIds(selectedBranchId, branchMap) {
  if (!selectedBranchId) return null;
  const targetId = String(selectedBranchId);
  const selectedName = (branchMap.get(targetId) || '').trim();
  const matching = new Set([targetId]);

  if (selectedName === 'বালক শাখা') {
    for (const [id, name] of branchMap.entries()) {
      const n = (name || '').trim();
      if (n === 'বালক শাখা + নুরানী' || n === 'বালক শাখা+নুরানী') matching.add(id);
    }
  } else if (selectedName === 'বালিকা শাখা') {
    for (const [id, name] of branchMap.entries()) {
      const n = (name || '').trim();
      if (n === 'বালিকা শাখা + নুরানী' || n === 'বালিকা শাখা+নুরানী') matching.add(id);
    }
  } else if (selectedName === 'নুরানী শাখা') {
    for (const [id, name] of branchMap.entries()) {
      const n = (name || '').trim();
      if (
        n === 'বালক শাখা + নুরানী' || n === 'বালক শাখা+নুরানী' ||
        n === 'বালিকা শাখা + নুরানী' || n === 'বালিকা শাখা+নুরানী'
      ) {
        matching.add(id);
      }
    }
  }

  return matching;
}

function doesStudentMatchFilters(student, filters, enrollmentInfo, branchMap) {
  if (!hasActiveStudentFilters(filters)) return true;

  const stuClass = enrollmentInfo?.classLevel || (student.classLevel ? String(student.classLevel) : '');
  const stuSection = (enrollmentInfo?.section || student.section || '').trim();
  const stuBranch = student.branch ? String(typeof student.branch === 'object' ? (student.branch._id || student.branch.id) : student.branch) : '';
  const stuDept = (student.department || enrollmentInfo?.department || '').trim();
  const stuRes = (student.residentialStatus || '').trim();

  if (filters.classLevel && String(filters.classLevel) !== stuClass) {
    return false;
  }

  if (filters.section && String(filters.section).trim() !== stuSection) {
    return false;
  }

  if (filters.branch) {
    const allowedBranches = getMatchingBranchIds(filters.branch, branchMap);
    if (!stuBranch || !allowedBranches.has(stuBranch)) {
      return false;
    }
  }

  if (filters.department) {
    const targetDept = String(filters.department).trim();
    if (stuDept !== targetDept && !stuDept.includes(targetDept.replace(' বিভাগ', ''))) {
      return false;
    }
  }

  if (filters.residentialStatus && String(filters.residentialStatus).trim() !== stuRes) {
    return false;
  }

  return true;
}

/**
 * Filter notices list for the currently logged-in user
 */
async function filterNoticesForUser(notices, user) {
  const userType = user?.userType || '';
  const currentUserId = String(user?._id || user?.id || '');
  const adminRoles = ['super_admin', 'co_super_admin', 'admin', 'principal', 'teacher', 'hifz_teacher'];

  // First, filter personal notices strictly to their intended userIds for ALL roles
  const accessibleNotices = notices.filter(notice => {
    const { roles, userIds } = parseNoticeAudience(notice.audience);
    if (roles.includes('personal')) {
      return Boolean(currentUserId && userIds.includes(currentUserId));
    }
    return true;
  });

  // Admins, principals & teachers see all non-personal published/institution notices
  if (adminRoles.includes(userType) || user?.adminRole === 'co_super_admin') {
    return accessibleNotices;
  }

  const branches = await Branch.findAll({ attributes: ['_id', 'name'] });
  const branchMap = new Map(branches.map(b => [String(b._id || b.id), b.name || '']));

  if (userType === 'student') {
    const studentDoc = await Student.findOne({
      where: { user: currentUserId, isDeleted: { [Op.ne]: true } }
    });

    let enrollmentMap = new Map();
    if (studentDoc) {
      enrollmentMap = await resolveStudentEnrollmentMap([studentDoc]);
    }

    return accessibleNotices.filter(notice => {
      const { roles, filters } = parseNoticeAudience(notice.audience);
      if (roles.includes('physical_board')) return false;
      if (roles.includes('personal')) return false; // already checked above
      if (roles.includes('all')) return true;
      if (!roles.includes('student')) return false;
      if (!hasActiveStudentFilters(filters)) return true;
      if (!studentDoc) return false;
      const sid = String(studentDoc._id || studentDoc.id);
      return doesStudentMatchFilters(studentDoc, filters, enrollmentMap.get(sid), branchMap);
    });
  }

  if (userType === 'guardian') {
    const guardianDoc = await Guardian.findOne({ where: { user: currentUserId } });

    const studentIds = [];
    if (guardianDoc && Array.isArray(guardianDoc.students)) {
      for (const item of guardianDoc.students) {
        if (typeof item === 'string') studentIds.push(item);
        else if (item && typeof item === 'object') {
          const id = item.student || item.studentId || item._id || item.id;
          if (id) studentIds.push(String(typeof id === 'object' ? (id._id || id.id) : id));
        }
      }
    }

    const childStudents = studentIds.length > 0
      ? await Student.findAll({
          where: { _id: { [Op.in]: studentIds }, isDeleted: { [Op.ne]: true } }
        })
      : [];

    const enrollmentMap = childStudents.length > 0
      ? await resolveStudentEnrollmentMap(childStudents)
      : new Map();

    return accessibleNotices.filter(notice => {
      const { roles, filters } = parseNoticeAudience(notice.audience);
      if (roles.includes('physical_board')) return false;
      if (roles.includes('personal')) return false;
      if (roles.includes('all')) return true;
      if (!roles.includes('guardian')) return false;
      if (!hasActiveStudentFilters(filters)) return true;
      if (childStudents.length === 0) return false;
      return childStudents.some(stu => {
        const sid = String(stu._id || stu.id);
        return doesStudentMatchFilters(stu, filters, enrollmentMap.get(sid), branchMap);
      });
    });
  }

  // Other staff/accountant roles: only 'all' or their own role (personal already kept in accessibleNotices)
  return accessibleNotices.filter(notice => {
    const { roles, userIds } = parseNoticeAudience(notice.audience);
    if (roles.includes('personal')) return Boolean(currentUserId && userIds.includes(currentUserId));
    return roles.includes('all') || roles.includes(userType);
  });
}

/**
 * Resolve exact target User IDs for push notifications
 */
async function getTargetUserIdsForNotice(notice) {
  const User = require('../models/User');
  const { roles, filters } = parseNoticeAudience(notice.audience);

  if (roles.includes('physical_board')) {
    return { isAll: false, userIds: [] };
  }

  if (roles.includes('all') || roles.length === 0) {
    return { isAll: true, userIds: [] };
  }

  const targetUserIds = new Set();

  // 1. Non-student/guardian roles (teachers, staff)
  const nonStuRoles = [];
  if (roles.includes('teacher')) nonStuRoles.push('teacher', 'hifz_teacher', 'principal', 'vice_principal');
  if (roles.includes('staff')) nonStuRoles.push('staff', 'accountant');

  if (nonStuRoles.length > 0) {
    const matchedStaff = await User.findAll({
      where: { userType: { [Op.in]: nonStuRoles }, status: 'active' },
      attributes: ['_id']
    });
    matchedStaff.forEach(u => targetUserIds.add(String(u._id)));
  }

  // 2. Student & Guardian roles (with optional 5-filter targeting)
  const needsStudent = roles.includes('student');
  const needsGuardian = roles.includes('guardian');

  if (needsStudent || needsGuardian) {
    if (!hasActiveStudentFilters(filters)) {
      const roleList = [];
      if (needsStudent) roleList.push('student');
      if (needsGuardian) roleList.push('guardian');
      const users = await User.findAll({
        where: { userType: { [Op.in]: roleList }, status: 'active' },
        attributes: ['_id']
      });
      users.forEach(u => targetUserIds.add(String(u._id)));
    } else {
      const stuWhere = { isDeleted: { [Op.ne]: true } };
      if (notice.institution) stuWhere.institution = notice.institution;
      const allStudents = await Student.findAll({ where: stuWhere });
      const branches = await Branch.findAll({ attributes: ['_id', 'name'] });
      const branchMap = new Map(branches.map(b => [String(b._id || b.id), b.name || '']));
      const enrollmentMap = await resolveStudentEnrollmentMap(allStudents);

      const matchedStudentIds = new Set();
      for (const stu of allStudents) {
        const sid = String(stu._id || stu.id);
        if (doesStudentMatchFilters(stu, filters, enrollmentMap.get(sid), branchMap)) {
          matchedStudentIds.add(sid);
          if (needsStudent && stu.user) {
            targetUserIds.add(String(stu.user));
          }
        }
      }

      if (needsGuardian && matchedStudentIds.size > 0) {
        const gWhere = {};
        if (notice.institution) gWhere.institution = notice.institution;
        const guardians = await Guardian.findAll({ where: gWhere });
        for (const g of guardians) {
          if (!g.user || !Array.isArray(g.students)) continue;
          const hasMatchedChild = g.students.some(item => {
            const id = typeof item === 'string'
              ? item
              : (item?.student || item?.studentId || item?._id || item?.id);
            return id && matchedStudentIds.has(String(typeof id === 'object' ? (id._id || id.id) : id));
          });
          if (hasMatchedChild) {
            targetUserIds.add(String(g.user));
          }
        }
      }
    }
  }

  return { isAll: false, userIds: Array.from(targetUserIds) };
}

/**
 * Create a private/personal Notice for specific userIds and send targeted push notification
 */
async function createPersonalNoticeAndPush({ institution, publishedBy, userIds = [], title, content, priority = 'normal', url = '/notices' }) {
  try {
    const uniqueIds = [...new Set((userIds || []).map(id => String(id)).filter(Boolean))];
    if (uniqueIds.length === 0) return null;

    const Notice = require('../models/Notice');
    const { sendTargetedPush } = require('./pushHelper');

    const notice = await Notice.create({
      institution: institution || '',
      title,
      content,
      audience: { roles: ['personal'], userIds: uniqueIds },
      priority,
      isPublished: true,
      publishedBy: publishedBy || null,
      publishedAt: new Date()
    });

    sendTargetedPush({
      userIds: uniqueIds,
      payload: {
        title,
        body: content ? content.substring(0, 110) : title,
        url
      }
    }).catch(() => {});

    return notice;
  } catch (err) {
    console.error('[Notice-Personal] Failed to create personal notice:', err.message);
    return null;
  }
}

/**
 * Notify a Student and their linked Guardian(s) on fee payment completion
 */
async function notifyStudentFeePayment({ institution, publishedBy, studentId, amount, invoiceLabel }) {
  try {
    if (!studentId) return;
    const stu = await Student.findOne({ where: { _id: String(studentId), isDeleted: { [Op.ne]: true } } });
    if (!stu) return;

    const targetUserIds = new Set();
    if (stu.user) targetUserIds.add(String(stu.user));

    const gWhere = {};
    if (institution) gWhere.institution = institution;
    const guardians = await Guardian.findAll({ where: gWhere });
    for (const g of guardians) {
      if (!g.user || !Array.isArray(g.students)) continue;
      const matches = g.students.some(item => {
        const id = typeof item === 'string'
          ? item
          : (item?.student || item?.studentId || item?._id || item?.id);
        return id && String(typeof id === 'object' ? (id._id || id.id) : id) === String(studentId);
      });
      if (matches) targetUserIds.add(String(g.user));
    }

    if (targetUserIds.size === 0) return;

    const formattedAmt = Number(amount || 0).toLocaleString('bn-BD');
    const title = `✅ ফি পেমেন্ট সম্পন্ন: ৳${formattedAmt}`;
    const content = `আসসালামু আলাইকুম। ${invoiceLabel ? `(${invoiceLabel}) বাবদ ` : ''}৳${formattedAmt} টাকা ফি পেমেন্ট সফলভাবে গ্রহণ করা হয়েছে। জাযাকাল্লাহু খাইরান।`;

    await createPersonalNoticeAndPush({
      institution: institution || stu.institution || '',
      publishedBy,
      userIds: Array.from(targetUserIds),
      title,
      content,
      priority: 'normal',
      url: '/my-payments'
    });
  } catch (err) {
    console.error('[Notice-FeePayment] Error:', err.message);
  }
}

/**
 * Notify a Teacher/Staff member when their salary is paid
 */
async function notifyTeacherSalaryPayment({ institution, publishedBy, salary, amount, paymentMethod }) {
  try {
    if (!salary) return;
    const User = require('../models/User');
    const Teacher = require('../models/Teacher');

    let targetUserId = '';
    if (salary.staffId) {
      const u = await User.findOne({ where: { _id: String(salary.staffId) }, attributes: ['_id'] });
      if (u) targetUserId = String(u._id);
    }
    if (!targetUserId && (salary.teacherId || salary.staffId)) {
      const t = await Teacher.findOne({ where: { _id: String(salary.teacherId || salary.staffId) }, attributes: ['user'] });
      if (t && t.user) targetUserId = String(t.user);
    }
    if (!targetUserId) return;

    const formattedAmt = Number(amount || 0).toLocaleString('bn-BD');
    const title = `💰 বেতন পরিশোধ সম্পন্ন: ${salary.month || ''} (৳${formattedAmt})`;
    const content = `আসসালামু আলাইকুম ${salary.staffName || ''}। আপনার ${salary.month || ''} মাসের বেতন বাবদ ৳${formattedAmt} টাকা${paymentMethod ? ` (${paymentMethod} মাধ্যমে)` : ''} সফলভাবে পরিশোধ করা হয়েছে।`;

    await createPersonalNoticeAndPush({
      institution: institution || salary.institution || '',
      publishedBy,
      userIds: [targetUserId],
      title,
      content,
      priority: 'normal',
      url: '/notices'
    });
  } catch (err) {
    console.error('[Notice-SalaryPayment] Error:', err.message);
  }
}

/**
 * Notify a Teacher/Staff member when an Advance Payment is given
 */
async function notifyTeacherAdvancePayment({ institution, publishedBy, personType, personName, amount, reason }) {
  try {
    if (!personName || !['staff', 'teacher'].includes(personType)) return;
    const User = require('../models/User');
    const Teacher = require('../models/Teacher');

    const targetName = String(personName).trim();
    let targetUserId = '';

    const tWhere = {};
    if (institution) tWhere.institution = institution;
    const teachers = await Teacher.findAll({ where: tWhere, attributes: ['user', 'name', 'fullName', 'firstName', 'lastName'] });
    for (const t of teachers) {
      const tName = (t.name || t.fullName || `${t.firstName || ''} ${t.lastName || ''}`).trim();
      if (tName === targetName && t.user) {
        targetUserId = String(t.user);
        break;
      }
    }

    if (!targetUserId) {
      const uWhere = { status: 'active' };
      if (institution) uWhere.institution = institution;
      const users = await User.findAll({ where: uWhere, attributes: ['_id', 'fullName', 'firstName', 'lastName'] });
      for (const u of users) {
        const uName = (u.fullName || `${u.firstName || ''} ${u.lastName || ''}`).trim();
        if (uName === targetName) {
          targetUserId = String(u._id);
          break;
        }
      }
    }

    if (!targetUserId) return;

    const formattedAmt = Number(amount || 0).toLocaleString('bn-BD');
    const title = `💸 অগ্রিম বেতন প্রদান: ৳${formattedAmt}`;
    const content = `আসসালামু আলাইকুম ${targetName}। আপনাকে ৳${formattedAmt} টাকা অগ্রিম প্রদান করা হয়েছে${reason ? ` (${reason})` : ''}।`;

    await createPersonalNoticeAndPush({
      institution: institution || '',
      publishedBy,
      userIds: [targetUserId],
      title,
      content,
      priority: 'normal',
      url: '/notices'
    });
  } catch (err) {
    console.error('[Notice-AdvancePayment] Error:', err.message);
  }
}

module.exports = {
  parseNoticeAudience,
  hasActiveStudentFilters,
  filterNoticesForUser,
  getTargetUserIdsForNotice,
  createPersonalNoticeAndPush,
  notifyStudentFeePayment,
  notifyTeacherSalaryPayment,
  notifyTeacherAdvancePayment
};
