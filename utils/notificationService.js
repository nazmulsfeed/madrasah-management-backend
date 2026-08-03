const axios = require('axios');

/**
 * Mock Notification Service
 * In a real application, this would integrate with a third-party SMS provider (e.g. Twilio, B-Trac)
 * or Email provider (e.g. SendGrid, Nodemailer).
 */
exports.sendSMS = async (phone, message) => {
  try {
    // Mock SMS sending
    console.log(`[SMS Sent] To: ${phone} | Message: ${message}`);
    // Real implementation:
    // await axios.post('https://api.sms-provider.com/send', { to: phone, text: message });
    return true;
  } catch (error) {
    console.error('Failed to send SMS:', error);
    return false;
  }
};

exports.sendEmail = async (email, subject, body) => {
  try {
    // Mock Email sending
    console.log(`[Email Sent] To: ${email} | Subject: ${subject} | Body: ${body}`);
    return true;
  } catch (error) {
    console.error('Failed to send Email:', error);
    return false;
  }
};
