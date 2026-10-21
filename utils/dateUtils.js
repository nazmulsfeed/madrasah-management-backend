/**
 * Date utilities for date ranges in Asia/Dhaka (+06:00)
 */

function getDayRange(dateStr) {
  const start = new Date(dateStr + 'T00:00:00.000+06:00');
  const end = new Date(dateStr + 'T23:59:59.999+06:00');
  return { start, end };
}

module.exports = {
  getDayRange,
};
