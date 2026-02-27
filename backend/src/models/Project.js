const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  center: {
    type: String,
    required: true,
  },
  scanRate: {
    type: Number,
    required: true, // Rate per scan
  },
  productivityLimit: {
    type: Number, // Max scans per day per operator if applicable
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Project', projectSchema);
