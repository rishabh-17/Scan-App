const mongoose = require('mongoose');

const centerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  centerCode: {
    type: String,
  },
  location: {
    type: String,
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active',
  },
  contactEmail: {
    type: String,
  },
  contactPhone: {
    type: String,
  },
  supervisors: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff',
  }],
}, {
  timestamps: true,
});

module.exports = mongoose.model('Center', centerSchema);
