const mongoose = require('mongoose');

const staffSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  employeeId: {
    type: String,
    unique: true,
    sparse: true, // Allows null/undefined values to be non-unique
  },
  scannerId: {
    type: String,
    unique: true,
    sparse: true,
  },
  bankDetails: {
    accountNo: { type: String },
    ifscCode: { type: String },
  },
  address: {
    type: String,
  },
  panNumber: {
    type: String,
    unique: true,
    sparse: true,
  },
  mobile: {
    type: String,
    required: true,
    unique: true,
  },
  photo: {
    type: String, // URL or base64
  },
  idProof: {
    type: String, // URL or base64
  },
  center: {
    type: String,
    required: true,
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
    enum: ['staff', 'supervisor', 'center_manager', 'project_manager', 'finance_manager', 'admin'],
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
