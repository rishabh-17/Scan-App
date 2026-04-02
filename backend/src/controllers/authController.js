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
  let {
    name,
    location,
    gender,
    fatherName,
    motherName,
    bloodGroup,
    mobile,
    alternateMobile,
    email,
    dob,
    address,
    city,
    state,
    pincode,
    aadhaarNumber,
    aadhaarDoc,
    panNumber,
    panDoc,
    photo,
    bankPassbookDoc,
    educationalDoc,
    highestEducation,
    affiliatedUniversity,
    previousEmployment,
    referenceSource,
    agencyName,
    referenceContactNo,
    bankDetails,
    center,
    password
  } = req.body;

  if (!name || !mobile || !alternateMobile || !password || !center) {
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
  if (!mobileRegex.test(alternateMobile)) {
    return res.status(400).json({ message: 'Invalid alternate mobile number' });
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
    location: location || '',
    gender: gender || '',
    fatherName: fatherName || '',
    motherName: motherName || '',
    bloodGroup: bloodGroup || '',
    mobile,
    alternateMobile,
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
    photo: photo || '',
    bankPassbookDoc: bankPassbookDoc || '',
    educationalDoc: educationalDoc || '',
    highestEducation: highestEducation || '',
    affiliatedUniversity: affiliatedUniversity || '',
    previousEmployment: previousEmployment || '',
    referenceSource: referenceSource || '',
    agencyName: agencyName || '',
    referenceContactNo: referenceContactNo || '',
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
  const loginIdRaw = req.body.loginId ?? req.body.mobile ?? req.body.username ?? '';
  const password = req.body.password;
  const loginId = String(loginIdRaw).trim();

  if (!loginId || !password) {
    return res.status(400).json({ message: 'Invalid credentials' });
  }

  const staff = await Staff.findOne({
    $or: [{ mobile: loginId }, { employeeId: loginId }],
  }).populate('project', 'name');

  if (staff && (await bcrypt.compare(password, staff.password))) {
    if (staff.status !== 'active') {
      return res.status(403).json({ message: 'Account is pending approval or inactive' });
    }

    res.json({
      _id: staff.id,
      name: staff.name,
      employeeId: staff.employeeId,
      mobile: staff.mobile,
      email: staff.email,
      dob: staff.dob,
      role: staff.role,
      center: staff.center,
      project: staff.project,
      location: staff.location,
      gender: staff.gender,
      fatherName: staff.fatherName,
      motherName: staff.motherName,
      bloodGroup: staff.bloodGroup,
      alternateMobile: staff.alternateMobile,
      address: staff.address,
      city: staff.city,
      state: staff.state,
      pincode: staff.pincode,
      aadhaarNumber: staff.aadhaarNumber,
      aadhaarDoc: staff.aadhaarDoc,
      panNumber: staff.panNumber,
      panDoc: staff.panDoc,
      bankDetails: staff.bankDetails,
      photo: staff.photo,
      bankPassbookDoc: staff.bankPassbookDoc,
      educationalDoc: staff.educationalDoc,
      highestEducation: staff.highestEducation,
      affiliatedUniversity: staff.affiliatedUniversity,
      previousEmployment: staff.previousEmployment,
      referenceSource: staff.referenceSource,
      agencyName: staff.agencyName,
      referenceContactNo: staff.referenceContactNo,
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

  const {
    name,
    location,
    gender,
    fatherName,
    motherName,
    bloodGroup,
    alternateMobile,
    email,
    dob,
    address,
    city,
    state,
    pincode,
    aadhaarNumber,
    aadhaarDoc,
    bankDetails,
    panNumber,
    panDoc,
    photo,
    bankPassbookDoc,
    educationalDoc,
    highestEducation,
    affiliatedUniversity,
    previousEmployment,
    referenceSource,
    agencyName,
    referenceContactNo
  } = req.body;

  if (name) user.name = name;
  if (email) user.email = email;
  if (dob) user.dob = dob;
  if (location) user.location = location;
  if (gender) user.gender = gender;
  if (fatherName) user.fatherName = fatherName;
  if (motherName) user.motherName = motherName;
  if (bloodGroup) user.bloodGroup = bloodGroup;
  if (alternateMobile) user.alternateMobile = alternateMobile;
  if (address) user.address = address;
  if (city) user.city = city;
  if (state) user.state = state;
  if (pincode) user.pincode = pincode;
  if (aadhaarNumber) user.aadhaarNumber = aadhaarNumber;
  if (aadhaarDoc) user.aadhaarDoc = aadhaarDoc;
  if (panDoc) user.panDoc = panDoc;
  if (photo) user.photo = photo;
  if (bankPassbookDoc) user.bankPassbookDoc = bankPassbookDoc;
  if (educationalDoc) user.educationalDoc = educationalDoc;
  if (highestEducation) user.highestEducation = highestEducation;
  if (affiliatedUniversity) user.affiliatedUniversity = affiliatedUniversity;
  if (previousEmployment) user.previousEmployment = previousEmployment;
  if (referenceSource) user.referenceSource = referenceSource;
  if (agencyName) user.agencyName = agencyName;
  if (referenceContactNo) user.referenceContactNo = referenceContactNo;

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
    location: updatedUser.location,
    gender: updatedUser.gender,
    fatherName: updatedUser.fatherName,
    motherName: updatedUser.motherName,
    bloodGroup: updatedUser.bloodGroup,
    alternateMobile: updatedUser.alternateMobile,
    address: updatedUser.address,
    city: updatedUser.city,
    state: updatedUser.state,
    pincode: updatedUser.pincode,
    aadhaarNumber: updatedUser.aadhaarNumber,
    aadhaarDoc: updatedUser.aadhaarDoc,
    panNumber: updatedUser.panNumber,
    panDoc: updatedUser.panDoc,
    bankDetails: updatedUser.bankDetails,
    photo: updatedUser.photo,
    bankPassbookDoc: updatedUser.bankPassbookDoc,
    educationalDoc: updatedUser.educationalDoc,
    highestEducation: updatedUser.highestEducation,
    affiliatedUniversity: updatedUser.affiliatedUniversity,
    previousEmployment: updatedUser.previousEmployment,
    referenceSource: updatedUser.referenceSource,
    agencyName: updatedUser.agencyName,
    referenceContactNo: updatedUser.referenceContactNo,
    token: generateToken(updatedUser._id),
  });
};

module.exports = {
  registerStaff,
  loginStaff,
  getMe,
  updateProfile,
};
