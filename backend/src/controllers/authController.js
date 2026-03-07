const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Staff = require('../models/Staff');
const Center = require('../models/Center');

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// @desc    Register new staff
// @route   POST /api/auth/register
// @access  Public
const registerStaff = async (req, res) => {
  let { name, mobile, email, dob, address, city, state, pincode, aadhaarNumber, aadhaarDoc, panNumber, panDoc, bankDetails, center, password } = req.body;

  if (!name || !mobile || !password || !center) {
    return res.status(400).json({ message: 'Please add all required fields' });
  }

  // Resolve Center Code to ID if necessary
  let centerId = center;
  const isObjectId = /^[0-9a-fA-F]{24}$/.test(center);

  if (!isObjectId) {
    // Treat as Center Code
    const centerObj = await Center.findOne({ centerCode: center });
    if (!centerObj) {
      return res.status(400).json({ message: 'Invalid Center Code' });
    }
    centerId = centerObj._id;
  }

  // Validations
  const mobileRegex = /^[6-9]\d{9}$/;
  if (!mobileRegex.test(mobile)) {
    return res.status(400).json({ message: 'Invalid mobile number' });
  }

  if (panNumber) {
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    if (!panRegex.test(panNumber)) {
      return res.status(400).json({ message: 'Invalid PAN number format' });
    }
  }

  if (bankDetails) {
    if (bankDetails.accountNo) {
      const accountRegex = /^\d{9,18}$/;
      if (!accountRegex.test(bankDetails.accountNo)) {
        return res.status(400).json({ message: 'Invalid account number' });
      }
    }
    if (bankDetails.ifscCode) {
      const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
      if (!ifscRegex.test(bankDetails.ifscCode)) {
        return res.status(400).json({ message: 'Invalid IFSC code' });
      }
    }
  }

  // Check if staff exists
  const staffExists = await Staff.findOne({ mobile });

  if (staffExists) {
    return res.status(400).json({ message: 'Staff already exists' });
  }

  // Check if PAN exists
  if (panNumber) {
    const panExists = await Staff.findOne({ panNumber });
    if (panExists) {
      return res.status(400).json({ message: 'PAN number already registered' });
    }
  }

  // Check if Aadhaar exists
  if (aadhaarNumber) {
    const aadhaarExists = await Staff.findOne({ aadhaarNumber });
    if (aadhaarExists) {
      return res.status(400).json({ message: 'Aadhaar number already registered' });
    }
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  // Create staff
  const staff = await Staff.create({
    name,
    mobile,
    email,
    dob,
    password: hashedPassword,
    center: centerId,
    role: 'staff', // Force role to staff for self-registration
    status: 'pending', // Explicitly set pending status
    address: address || '',
    city: city || '',
    state: state || '',
    pincode: pincode || '',
    aadhaarNumber: aadhaarNumber || '',
    aadhaarDoc: aadhaarDoc || '',
    panNumber: panNumber || '',
    panDoc: panDoc || '',
    bankDetails: {
      accountNo: bankDetails?.accountNo || '',
      ifscCode: bankDetails?.ifscCode || '',
      bankName: bankDetails?.bankName || '',
      accountHolderName: bankDetails?.accountHolderName || '',
      cancelledChequeDoc: bankDetails?.cancelledChequeDoc || '',
    },
  });

  if (staff) {
    res.status(201).json({
      _id: staff.id,
      name: staff.name,
      mobile: staff.mobile,
      role: staff.role,
      status: staff.status,
      message: 'Registration successful. Please wait for admin approval.',
    });
  } else {
    res.status(400).json({ message: 'Invalid staff data' });
  }
};

// @desc    Authenticate a staff
// @route   POST /api/auth/login
// @access  Public
const loginStaff = async (req, res) => {
  const { mobile, password } = req.body;

  // Check for staff mobile
  const staff = await Staff.findOne({ mobile }).populate('project', 'name');

  if (staff && (await bcrypt.compare(password, staff.password))) {
    if (staff.status !== 'active') {
      return res.status(403).json({ message: 'Account is pending approval or inactive' });
    }

    res.json({
      _id: staff.id,
      name: staff.name,
      mobile: staff.mobile,
      role: staff.role,
      center: staff.center,
      project: staff.project,
      token: generateToken(staff._id),
    });
  } else {
    res.status(400).json({ message: 'Invalid credentials' });
  }
};

// @desc    Get staff data
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  res.status(200).json(req.user);
};

// @desc    Update staff profile
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = async (req, res) => {
  const user = await Staff.findById(req.user._id);

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  const { name, email, dob, address, city, state, pincode, aadhaarNumber, bankDetails, panNumber } = req.body;

  if (name) user.name = name;
  if (email) user.email = email;
  if (dob) user.dob = dob;
  if (address) user.address = address;
  if (city) user.city = city;
  if (state) user.state = state;
  if (pincode) user.pincode = pincode;
  if (aadhaarNumber) user.aadhaarNumber = aadhaarNumber;

  if (panNumber) {
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    if (!panRegex.test(panNumber)) {
      return res.status(400).json({ message: 'Invalid PAN number format' });
    }
    // Check if PAN is taken by another user
    const panExists = await Staff.findOne({ panNumber, _id: { $ne: user._id } });
    if (panExists) {
      return res.status(400).json({ message: 'PAN number already registered' });
    }
    user.panNumber = panNumber;
  }

  if (bankDetails) {
    if (bankDetails.accountNo) {
      const accountRegex = /^\d{9,18}$/;
      if (!accountRegex.test(bankDetails.accountNo)) {
        return res.status(400).json({ message: 'Invalid account number' });
      }
      user.bankDetails.accountNo = bankDetails.accountNo;
    }
    if (bankDetails.ifscCode) {
      const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
      if (!ifscRegex.test(bankDetails.ifscCode)) {
        return res.status(400).json({ message: 'Invalid IFSC code' });
      }
      user.bankDetails.ifscCode = bankDetails.ifscCode;
    }
    if (bankDetails.bankName) user.bankDetails.bankName = bankDetails.bankName;
    if (bankDetails.accountHolderName) user.bankDetails.accountHolderName = bankDetails.accountHolderName;
  }

  const updatedUser = await user.save();

  res.json({
    _id: updatedUser._id,
    name: updatedUser.name,
    mobile: updatedUser.mobile,
    email: updatedUser.email,
    dob: updatedUser.dob,
    role: updatedUser.role,
    center: updatedUser.center,
    project: updatedUser.project,
    address: updatedUser.address,
    city: updatedUser.city,
    state: updatedUser.state,
    pincode: updatedUser.pincode,
    aadhaarNumber: updatedUser.aadhaarNumber,
    panNumber: updatedUser.panNumber,
    bankDetails: updatedUser.bankDetails,
    token: generateToken(updatedUser._id),
  });
};

module.exports = {
  registerStaff,
  loginStaff,
  getMe,
  updateProfile,
};
