const Staff = require('../models/Staff');
const Payment = require('../models/Payment');
const xlsx = require('xlsx');
const mongoose = require('mongoose');
const Project = require('../models/Project');

const isFinanceUser = (user) => user && (user.role === 'admin' || user.role === 'finance_hr');
const canEditFailedPayment = (user) => user && ['admin', 'finance_hr', 'project_manager'].includes(user.role);

const getManagedProjectIds = async (user) => {
  if (!user || user.role !== 'project_manager') return [];
  if (user.project) return [String(user.project)];
  const projects = await Project.find({ managers: user._id }).select('_id').lean();
  return projects.map((p) => String(p._id));
};

const canAccessPayment = async (user, payment) => {
  if (!user || !payment) return false;
  if (isFinanceUser(user)) return true;

  if (user.role === 'project_manager') {
    const paymentWithStaff = payment.staff?.project ? payment : await Payment.findById(payment._id).populate('staff', 'project');
    const projectId = paymentWithStaff?.staff?.project ? String(paymentWithStaff.staff.project) : null;
    if (!projectId) return false;
    const managedProjectIds = await getManagedProjectIds(user);
    return managedProjectIds.includes(projectId);
  }

  return false;
};

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
    const { center, project, status } = req.query;
    const requestedStatuses = typeof status === 'string'
      ? status.split(',').map((s) => s.trim()).filter(Boolean)
      : [];

    if (!isFinanceUser(req.user) && req.user.role !== 'project_manager') {
      return res.status(401).json({ message: 'Not authorized to view payments' });
    }

    const projectManagerProjectIds = req.user.role === 'project_manager'
      ? await getManagedProjectIds(req.user)
      : [];

    if (req.user.role === 'project_manager' && projectManagerProjectIds.length === 0) {
      return res.json([]);
    }

    // If no filters, default to existing populate approach
    if (!center && !project && requestedStatuses.length === 0) {
      const query = {};
      if (req.user.role === 'project_manager') {
        const staffIds = await Staff.find({ project: { $in: projectManagerProjectIds } }).select('_id').lean();
        query.staff = { $in: staffIds.map((s) => s._id) };
      }

      const payments = await Payment.find(query)
        .populate('staff', 'name mobile center project employeeId bankDetails')
        .sort({ paymentDate: -1 });
      return res.json(payments);
    }

    const pipeline = [
      {
        $lookup: {
          from: 'staffs',
          localField: 'staff',
          foreignField: '_id',
          as: 'staff',
        },
      },
      { $unwind: '$staff' },
    ];

    const match = {};
    if (center && mongoose.Types.ObjectId.isValid(center)) {
      match['staff.center'] = new mongoose.Types.ObjectId(center);
    }
    if (project && mongoose.Types.ObjectId.isValid(project)) {
      match['staff.project'] = new mongoose.Types.ObjectId(project);
    }
    if (req.user.role === 'project_manager') {
      match['staff.project'] = project && mongoose.Types.ObjectId.isValid(project)
        ? new mongoose.Types.ObjectId(project)
        : { $in: projectManagerProjectIds.map((id) => new mongoose.Types.ObjectId(id)) };
    }
    if (requestedStatuses.length > 0) {
      match.status = { $in: requestedStatuses };
    }
    if (Object.keys(match).length > 0) {
      pipeline.push({ $match: match });
    }

    pipeline.push({ $sort: { paymentDate: -1 } });

    const payments = await Payment.aggregate(pipeline);
    res.json(payments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get my payments
// @route   GET /api/payments/my-payments
// @access  Private
const getMyPayments = async (req, res) => {
  try {
    const payments = await Payment.find({ staff: req.user._id })
      .sort({ paymentDate: -1 });
    res.json(payments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update payment status
// @route   PUT /api/payments/:id
// @access  Private/Admin
const updatePaymentStatus = async (req, res) => {
  try {
    if (!isFinanceUser(req.user)) {
      return res.status(401).json({ message: 'Not authorized as finance manager' });
    }

    const { status } = req.body;
    const payment = await Payment.findById(req.params.id);

    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    if (!['pending', 'processed', 'failed', 'paid'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    payment.status = status;
    await payment.save();

    res.json(payment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const markPaymentFailed = async (req, res) => {
  try {
    if (!isFinanceUser(req.user)) {
      return res.status(401).json({ message: 'Not authorized as finance manager' });
    }

    const { reason } = req.body;
    if (!String(reason || '').trim()) {
      return res.status(400).json({ message: 'Rejection reason is required' });
    }

    const payment = await Payment.findById(req.params.id).populate('staff', 'name mobile project bankDetails');
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    payment.status = 'failed';
    payment.failureReason = String(reason).trim();
    payment.failureMarkedBy = req.user._id;
    payment.failureMarkedAt = new Date();
    payment.resubmittedBy = undefined;
    payment.resubmittedAt = undefined;
    await payment.save();

    res.json(payment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateFailedPaymentStaff = async (req, res) => {
  try {
    if (!canEditFailedPayment(req.user)) {
      return res.status(401).json({ message: 'Not authorized to update failed payment staff details' });
    }

    const payment = await Payment.findById(req.params.id).populate('staff');
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    if (payment.status !== 'failed') {
      return res.status(400).json({ message: 'Only failed payment records can be updated' });
    }

    const authorized = await canAccessPayment(req.user, payment);
    if (!authorized) {
      return res.status(403).json({ message: 'Not authorized to edit this failed payment record' });
    }

    const staff = payment.staff;
    if (!staff) {
      return res.status(404).json({ message: 'Linked staff not found' });
    }

    const { name, bankDetails } = req.body || {};
    if (name !== undefined) {
      const trimmedName = String(name).trim();
      if (!trimmedName) {
        return res.status(400).json({ message: 'Name cannot be empty' });
      }
      staff.name = trimmedName;
    }

    const parsedBankDetails = typeof bankDetails === 'string'
      ? JSON.parse(bankDetails)
      : (bankDetails || {});

    staff.bankDetails = {
      ...(staff.bankDetails || {}),
      ...(parsedBankDetails.accountNo !== undefined ? { accountNo: String(parsedBankDetails.accountNo || '').trim() } : {}),
      ...(parsedBankDetails.ifscCode !== undefined ? { ifscCode: String(parsedBankDetails.ifscCode || '').trim().toUpperCase() } : {}),
      ...(parsedBankDetails.bankName !== undefined ? { bankName: String(parsedBankDetails.bankName || '').trim() } : {}),
      ...(parsedBankDetails.accountHolderName !== undefined ? { accountHolderName: String(parsedBankDetails.accountHolderName || '').trim() } : {}),
    };

    await staff.save();

    payment.correctionUpdatedBy = req.user._id;
    payment.correctionUpdatedAt = new Date();
    await payment.save();

    const updatedPayment = await Payment.findById(payment._id).populate('staff', 'name mobile center project employeeId bankDetails');
    res.json(updatedPayment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const resubmitFailedPayment = async (req, res) => {
  try {
    if (!req.user || !['admin', 'project_manager'].includes(req.user.role)) {
      return res.status(401).json({ message: 'Not authorized to resubmit failed payment records' });
    }

    const payment = await Payment.findById(req.params.id).populate('staff', 'project');
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    if (payment.status !== 'failed') {
      return res.status(400).json({ message: 'Only failed payment records can be resubmitted' });
    }

    const authorized = await canAccessPayment(req.user, payment);
    if (!authorized) {
      return res.status(403).json({ message: 'Not authorized to resubmit this failed payment record' });
    }

    payment.status = 'pending';
    payment.resubmittedBy = req.user._id;
    payment.resubmittedAt = new Date();
    await payment.save();

    res.json(payment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Create a payment
// @route   POST /api/payments
// @access  Private/Admin
const createPayment = async (req, res) => {
  try {
    const { staff, amount, paymentMode, transactionId, remarks, status } = req.body;

    if (!staff || !amount) {
      return res.status(400).json({ message: 'Please provide staff and amount' });
    }

    const payment = await Payment.create({
      staff,
      amount,
      paymentMode: paymentMode || 'bank_transfer',
      transactionId,
      remarks,
      status: status || 'processed',
      paymentDate: new Date(),
    });

    res.status(201).json(payment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  importPayments,
  getPayments,
  getMyPayments,
  updatePaymentStatus,
  createPayment,
  markPaymentFailed,
  updateFailedPaymentStaff,
  resubmitFailedPayment,
};
