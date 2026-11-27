/**
 * ============================================================================
 * স্বতন্ত্র রাউট: ম্যানুয়াল বেতন চেকলিস্ট (/api/v1/manual-fee-checklist)
 * ============================================================================
 * পরিচালকের বিশেষ অনুরোধে তৈরি — মূল ফি ও অ্যাকাউন্টিং সিস্টেম থেকে সম্পূর্ণ আলাদা।
 * ============================================================================
 */
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  requireChecklistAccess,
  getChecklist,
  saveChecklist,
  getAccessUsers,
  saveAccessUsers
} = require('../controllers/manualFeeChecklistController');

router.use(protect);

router.get('/access-users', getAccessUsers);
router.post('/access-users', saveAccessUsers);

router.use(requireChecklistAccess);

router.get('/', getChecklist);
router.post('/save', saveChecklist);

module.exports = router;
