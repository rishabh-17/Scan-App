const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const Staff = require('./src/models/Staff');

dotenv.config();

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB Connected');

    const adminMobile = '9999999999';
    const adminExists = await Staff.findOne({ mobile: adminMobile });

    if (adminExists) {
      console.log('Admin user already exists');
      console.log('Mobile:', adminMobile);
      // We don't want to overwrite the password if it exists, just notify
    } else {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('admin123', salt);

      const admin = await Staff.create({
        name: 'Super Admin',
        mobile: adminMobile,
        password: hashedPassword,
        center: 'Headquarters',
        role: 'admin',
        status: 'active'
      });

      console.log('Admin user created successfully');
      console.log('Mobile:', admin.mobile);
      console.log('Password: admin123');
    }

    process.exit();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

createAdmin();
