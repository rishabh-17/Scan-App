const mongoose = require('mongoose');

const scanEntrySchema = new mongoose.Schema({
  operatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff',
    required: true,
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
  },
  scans: {
    type: Number,
    required: true,
  },
  date: {
    type: Date,
    required: true,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ['entered', 'supervisor_verified', 'center_approved', 'project_approved', 'finance_approved', 'locked'],
    default: 'entered',
  },
  approvals: {
    supervisor: {
      approved: { type: Boolean, default: false },
      by: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
      date: Date,
    },
    center: {
      approved: { type: Boolean, default: false },
      by: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
      date: Date,
    },
    project: {
      approved: { type: Boolean, default: false },
      by: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
      date: Date,
    },
    finance: {
      approved: { type: Boolean, default: false },
      by: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
      date: Date,
    },
  },
  auditTrail: [
    {
      action: String,
      by: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
      date: { type: Date, default: Date.now },
      details: String,
    },
  ],
}, {
  timestamps: true,
});

module.exports = mongoose.model('ScanEntry', scanEntrySchema);
