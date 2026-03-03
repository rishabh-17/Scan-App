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
    default: 'entered',
  },
  rejectionReason: {
    type: String,
  },
  approvals: {
    type: Map,
    of: new mongoose.Schema({
      approved: { type: Boolean, default: false },
      by: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
      date: Date,
    }, { _id: false }),
    default: {}
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
