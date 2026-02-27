const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  staff: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff',
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  paymentDate: {
    type: Date,
    default: Date.now,
  },
  paymentMode: {
    type: String,
    enum: ['bank_transfer', 'cash', 'upi', 'cheque'],
    default: 'bank_transfer',
  },
  transactionId: {
    type: String,
  },
  accountDetails: {
    accountNo: String,
    ifscCode: String,
    bankName: String,
  },
  remarks: {
    type: String,
  },
  status: {
    type: String,
    enum: ['pending', 'processed', 'failed'],
    default: 'processed',
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Payment', paymentSchema);
