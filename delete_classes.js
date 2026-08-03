const db = require('./config/db');
const ClassLevel = require('./models/ClassLevel');
const { Op } = require('sequelize');

const run = async () => {
  try {
    await db.connectDB();
    
    const namesToDelete = ['প্লে', 'নার্সারী', 'প্রথম', 'দ্বিতীয়', 'তৃতীয়'];
    
    // Check what we are about to delete
    const classes = await ClassLevel.findAll({
      where: {
        name: {
          [Op.in]: namesToDelete
        }
      }
    });
    
    if (classes.length === 0) {
      console.log('No classes found matching the names.');
      process.exit(0);
      return;
    }
    
    console.log(`Found ${classes.length} classes to delete:`);
    classes.forEach(c => console.log(`- ${c.name} (${c._id})`));
    
    // Delete them
    const result = await ClassLevel.destroy({
      where: {
        name: {
          [Op.in]: namesToDelete
        }
      }
    });
    
    console.log(`Successfully deleted ${result} classes.`);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
};

run();
