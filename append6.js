const fs = require('fs');
const content = fs.readFileSync('server/routes/users.js', 'utf-8');

const newRoute = `
// Change Branch (Multi-Branch for super_admin)
router.post('/change-branch', protect, authorize('super_admin'), async (req, res, next) => {
  try {
    const { branch } = req.body;
    if (!branch) return res.status(400).json({ success: false, message: 'Branch name is required' });
    
    req.user.institution = branch;
    await req.user.save();
    
    res.status(200).json({ success: true, message: \`Branch switched to \${branch}\` });
  } catch (error) { next(error); }
});
`;

fs.appendFileSync('server/routes/users.js', newRoute);
