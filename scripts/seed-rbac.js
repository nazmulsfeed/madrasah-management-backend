const path = require('path');
const dotenv = require('dotenv');
// Load environment variables before initializing any DB config
dotenv.config({ path: path.join(__dirname, '../.env') });

const sequelize = require('../config/db');
const RolePermission = require('../models/RolePermission');
const { defaultRolePermissions } = require('../utils/permissions');

const seedRbac = async () => {
  try {
    console.log('🔌 Connecting to Database...');
    await sequelize.connectDB();
    
    console.log('🗑️ Removing old role permissions...');
    await RolePermission.destroy({ where: {}, truncate: true });

    console.log('➕ Seeding granular role permissions...');
    
    const roleEntries = Object.entries(defaultRolePermissions).map(([role, permissions]) => {
      return {
        role,
        permissions
      };
    });

    await RolePermission.bulkCreate(roleEntries);

    console.log('✅ Role permissions successfully seeded!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during role permissions seeding:', error);
    process.exit(1);
  }
};

seedRbac();
