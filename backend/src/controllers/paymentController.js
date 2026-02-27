const Staff = require('../models/Staff');
const Payment = require('../models/Payment');
const xlsx = require('xlsx');

// @desc    Import payments from Excel
// @route   POST /api/payments/import
// @access  Private/Admin
const importPayments = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const workbook = xlsx.read(req.file.buffer, { type: 'buffer', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);

    const results = {
      success: 0,
      failed: 0,
      errors: [],
    };

    for (const row of data) {
      // Normalize keys to lowercase for easier matching
      const normalizedRow = {};
      Object.keys(row).forEach(key => {
        normalizedRow[key.toLowerCase().replace(/\s+/g, '')] = row[key];
      });

      const mobile = normalizedRow['mobile'] || normalizedRow['mobileno'] || normalizedRow['phoneno'];
      const amount = normalizedRow['amount'];
      const paymentDate = normalizedRow['paymentdate'] || normalizedRow['date'];
      const transactionId = normalizedRow['transactionid'] || normalizedRow['refno'];
      const remarks = normalizedRow['remarks'];
      const accountNo = normalizedRow['accountno'] || normalizedRow['account'];
      const ifscCode = normalizedRow['ifsccode'] || normalizedRow['ifsc'];

      if (!mobile || !amount) {
        results.failed++;
        results.errors.push(`Row missing mobile or amount: ${JSON.stringify(row)}`);
        continue;
      }

      const staff = await Staff.findOne({ mobile: String(mobile) });

      if (!staff) {
        results.failed++;
        results.errors.push(`Staff not found for mobile: ${mobile}`);
        continue;
      }

      await Payment.create({
        staff: staff._id,
        amount,
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
        transactionId,
        remarks,
        accountDetails: {
          accountNo,
          ifscCode,
        },
        status: 'processed',
      });

      results.success++;
    }

    res.json({
      message: 'Import completed',
      results,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error during import' });
  }
};

// @desc    Get all payments
// @route   GET /api/payments
// @access  Private/Admin
const getPayments = async (req, res) => {
  try {
    const payments = await Payment.find({})
      .populate('staff', 'name mobile center project')
      .sort({ paymentDate: -1 });
    res.json(payments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  importPayments,
  getPayments,
};
