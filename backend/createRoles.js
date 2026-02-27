const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const Staff = require('./src/models/Staff');
const connectDB = require('./src/config/db');

dotenv.config();
connectDB();

const createUsers = async () => {
  try {
    const salt = await bcrypt.genSalt(10);
    const password = await bcrypt.hash('123456', salt);

    const users = [
      {
        name: 'Supervisor User',
        mobile: '9000000001',
        password,
        role: 'supervisor',
        center: 'Center A',
        status: 'active',
      },
      {
        name: 'Center Manager',
        mobile: '9000000002',
        password,
        role: 'center_manager',
        center: 'Center A',
        status: 'active',
      },
      {
        name: 'Project Manager',
        mobile: '9000000003',
        password,
        role: 'project_manager',
        center: 'Head Office',
        status: 'active',
      },
      {
        name: 'Finance Manager',
        mobile: '9000000004',
        password,
        role: 'finance_manager',
        center: 'Head Office',
        status: 'active',
      },
      {
        name: 'Super Admin',
        mobile: '9000000005',
        password,
        role: 'admin',
        center: 'Head Office',
        status: 'active',
      },
    ];

    for (const user of users) {
      const exists = await Staff.findOne({ mobile: user.mobile });
      if (exists) {
        // Update existing user to ensure correct role/password if needed
        exists.role = user.role;
        exists.password = user.password;
        exists.status = 'active';
        await exists.save();
        console.log(`Updated user: ${user.name} (${user.role})`);
      } else {
        await Staff.create(user);
        console.log(`Created user: ${user.name} (${user.role})`);
      }
    }

    console.log('All roles created/updated successfully');
    process.exit();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

createUsers();