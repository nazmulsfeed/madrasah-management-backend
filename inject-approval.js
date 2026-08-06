const fs = require('fs');
const content = fs.readFileSync('server/controllers/financeController.js', 'utf-8');

const targetString = `voucher.status = status;`;
const newString = `// Multi-level approval logic
    if (status === 'approved') {
      if (voucher.approvalLevel === 0) {
        voucher.status = 'level_1_approved';
        voucher.approvalLevel = 1;
      } else if (voucher.approvalLevel === 1) {
        voucher.status = 'approved';
        voucher.approvalLevel = 2;
      } else {
        voucher.status = status;
      }
    } else {
      voucher.status = status;
    }`;

const updatedContent = content.replace(targetString, newString);
fs.writeFileSync('server/controllers/financeController.js', updatedContent);
