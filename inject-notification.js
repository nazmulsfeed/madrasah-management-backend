const fs = require('fs');
const content = fs.readFileSync('server/controllers/financeController.js', 'utf-8');

// We need to inject the notification service import at the top
let updatedContent = `const { sendSMS, sendEmail } = require('../utils/notificationService');\n` + content;

// Find the receivePayment method and add a mock notification
const targetString = `await processJournalForPayment(payment, invoice, institution);`;
const newString = `await processJournalForPayment(payment, invoice, institution);
    
    // SMS/Email Notification
    if (student && student.phone) {
      await sendSMS(student.phone, \`Dear \${student.name}, your payment of \${amount} BDT has been received successfully. Invoice: \${invoice.invoiceNumber}\`);
    }`;

updatedContent = updatedContent.replace(targetString, newString);

fs.writeFileSync('server/controllers/financeController.js', updatedContent);
