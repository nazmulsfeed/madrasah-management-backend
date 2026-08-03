/**
 * সিস্টেম কনস্ট্যান্টস — এই তথ্যগুলো কোডে সংরক্ষিত, ডাটাবেজে নয়।
 * ডাটাবেজ রিসেট হলেও এগুলো অপরিবর্তিত থাকবে।
 */

// সুপার অ্যাডমিনের ডিফল্ট লগইন তথ্য
const SUPERADMIN_USERNAME = 'admin';
const SUPERADMIN_EMAIL    = 'admin@madrasah.com';
const SUPERADMIN_PASSWORD = 'admin123';

// ডাটাবেজ রিসেট পাসওয়ার্ড (পরিবর্তনযোগ্য নয়)
const DB_RESET_PASSWORD = '0000';

module.exports = {
  SUPERADMIN_USERNAME,
  SUPERADMIN_EMAIL,
  SUPERADMIN_PASSWORD,
  DB_RESET_PASSWORD,
};
