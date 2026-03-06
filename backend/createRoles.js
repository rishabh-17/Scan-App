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
        name: 'Center Supervisor',
        mobile: '9000000001',
        password,
        role: 'center_supervisor',
        center: 'Center A',
        status: 'active',
        employeeId: 'CS001',
      },
      {
        name: 'Project Manager',
        mobile: '9000000003',
        password,
        role: 'project_manager',
        center: 'Head Office',
        status: 'active',
        employeeId: 'PM001',
      },
      {
        name: 'Finance/HR',
        mobile: '9000000004',
        password,
        role: 'finance_hr',
        center: 'Head Office',
        status: 'active',
        employeeId: 'FH001',
      },
      {
        name: 'Super Admin',
        mobile: '9000000005',
        password,
        role: 'admin',
        center: 'Head Office',
        status: 'active',
        employeeId: 'AD001',
      },
    ];

    for (const user of users) {
      let exists = await Staff.findOne({ mobile: user.mobile });
      if (exists) {
        // Update existing user to ensure correct role/password if needed
        exists.role = user.role;
        exists.password = user.password; // Reset password
        exists.status = 'active';
        if (!exists.employeeId) exists.employeeId = user.employeeId;
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
