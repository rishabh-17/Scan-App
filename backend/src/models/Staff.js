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
