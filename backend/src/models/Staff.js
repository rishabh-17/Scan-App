const mongoose = require('mongoose');

const staffSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  employeeId: {
    type: String,
    unique: true,
    sparse: true, // Allow multiple documents to have no employeeId
  },
  // scannerId removed as per requirement
  dob: {
    type: Date,
  },
  location: {
    type: String,
  },
  gender: {
    type: String,
  },
  fatherName: {
    type: String,
  },
  motherName: {
    type: String,
  },
  bloodGroup: {
    type: String,
  },
  address: {
    type: String,
  },
  city: {
    type: String,
  },
  state: {
    type: String,
  },
  pincode: {
    type: String,
  },
  aadhaarNumber: {
    type: String,
    unique: true,
    sparse: true,
  },
  aadhaarDoc: {
    type: String, // Path to uploaded file
  },
  panNumber: {
    type: String,
    unique: true,
    sparse: true,
  },
  panDoc: {
    type: String, // Path to uploaded file
  },
  bankDetails: {
    accountNo: { type: String },
    confirmAccountNo: { type: String }, // Virtual, not stored? Or validation only. Store for now if needed or handle in controller. Ideally not stored.
    ifscCode: { type: String },
    bankName: { type: String },
    accountHolderName: { type: String },
    cancelledChequeDoc: { type: String }, // Path to uploaded file
  },
  mobile: {
    type: String,
    required: true,
    unique: true,
  },
  alternateMobile: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    sparse: true,
    unique: true,
  },
  photo: {
    type: String, // URL or base64
  },
  idProof: {
    type: String, // URL or base64
  },
  bankPassbookDoc: {
    type: String, // URL or base64
  },
  educationalDoc: {
    type: String, // URL or base64
  },
  highestEducation: {
    type: String,
  },
  affiliatedUniversity: {
    type: String,
  },
  previousEmployment: {
    type: String,
  },
  referenceSource: {
    type: String,
  },
  agencyName: {
    type: String,
  },
  referenceContactNo: {
    type: String,
  },
  center: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Center',
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'pending'],
    default: 'pending',
  },
  role: {
    type: String,
    enum: ['center_supervisor', 'project_manager', 'finance_hr', 'admin', 'staff'],
    default: 'staff',
  },
  password: {
    type: String,
    required: true,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Staff', staffSchema);
