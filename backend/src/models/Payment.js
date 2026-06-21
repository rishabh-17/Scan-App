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
  failureReason: {
    type: String,
  },
  failureMarkedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff',
  },
  failureMarkedAt: {
    type: Date,
  },
  correctionUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff',
  },
  correctionUpdatedAt: {
    type: Date,
  },
  resubmittedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff',
  },
  resubmittedAt: {
    type: Date,
  },
  status: {
    type: String,
    enum: ['pending', 'processed', 'failed', 'paid'],
    default: 'processed',
  },
  payrollDetails: {
    sNo: String,
    userId: String,
    userName: String,
    mobile: String,
    department: String,
    source: String,
    noOfDays: Number,
    dayWisePay: Number,
    totalPerDayPayment: Number,
    inwardCount: Number,
    inwardPayment: Number,
    scanAmountPerScript: Number,
    scanCount: Number,
    scanningTotalAmount: Number,
    qcAmountPerScript: Number,
    qcCount: Number,
    qcTotalAmount: Number,
    outwardAmountPerScript: Number,
    outwardCount: Number,
    outwardTotalAmount: Number,
    stickerAmountPerScript: Number,
    stickerCount: Number,
    stickerTotalAmount: Number,
    totalPay: Number,
    statusPayHold: String,
    aadhaarNumber: String,
    panNumber: String,
    accountNo: String,
    bank: String,
    ifscCode: String,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Payment', paymentSchema);
