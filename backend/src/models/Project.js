const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  clientName: {
    type: String,
  },
  projectCode: {
    type: String,
  },
  startDate: {
    type: Date,
  },
  endDate: {
    type: Date,
  },
  centers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Center',
  }],
  managers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff',
  }],
  scanRate: {
    type: Number,
    default: 0,
    // required: true, // Rate per scan - No longer required as per user request
  },
  productivityLimit: {
    type: Number, // Max scans per day per operator if applicable
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  rateChart: [{
    activityName: { type: String, required: true },
    rate: { type: Number, required: true },
    effectiveDate: { type: Date, default: Date.now },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' }
  }]
}, {
  timestamps: true,
});

module.exports = mongoose.model('Project', projectSchema);
