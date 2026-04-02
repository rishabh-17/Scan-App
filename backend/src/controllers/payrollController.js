const ScanEntry = require('../models/ScanEntry');
const mongoose = require('mongoose');
const Staff = require('../models/Staff');
const Payment = require('../models/Payment');
const XLSX = require('xlsx');

// @desc    Get payroll report
// @route   GET /api/payroll
// @access  Private (Admin)
const getPayroll = async (req, res) => {
  try {
    const { center, project } = req.query;

    const pipeline = [];

    const baseMatch = {
      status: { $in: ['project_approved', 'finance_approved', 'locked'] },
    };
    if (project && mongoose.Types.ObjectId.isValid(project)) {
      baseMatch.projectId = new mongoose.Types.ObjectId(project);
    }

    pipeline.push({ $match: baseMatch });

    pipeline.push({
      $lookup: {
        from: 'projects',
        localField: 'projectId',
        foreignField: '_id',
        as: 'project',
      },
    });
    pipeline.push({ $unwind: '$project' });

    pipeline.push({
      $lookup: {
        from: 'staffs',
        localField: 'operatorId',
        foreignField: '_id',
        as: 'operator',
      },
    });
    pipeline.push({ $unwind: '$operator' });

    if (center && mongoose.Types.ObjectId.isValid(center)) {
      pipeline.push({
        $match: { 'operator.center': new mongoose.Types.ObjectId(center) },
      });
    }

    pipeline.push({
      $group: {
        _id: {
          operatorId: '$operatorId',
          operatorName: '$operator.name',
          projectId: '$projectId',
          projectName: '$project.name',
          rate: '$project.scanRate',
          bankDetails: '$operator.bankDetails',
          panNumber: '$operator.panNumber',
          mobile: '$operator.mobile',
          center: '$operator.center',
        },
        totalScans: { $sum: '$scans' },
        workedDays: {
          $addToSet: {
            $dateTrunc: { date: '$date', unit: 'day' },
          },
        },
      },
    });

    pipeline.push({
      $lookup: {
        from: 'payments',
        let: { operatorId: '$_id.operatorId' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$staff', '$$operatorId'] },
                  { $in: ['$status', ['processed', 'paid']] },
                ],
              },
            },
          },
          {
            $group: {
              _id: null,
              totalPaid: { $sum: '$amount' },
              lastPaymentDate: { $max: '$paymentDate' },
            },
          },
        ],
        as: 'payments',
      },
    });

    pipeline.push({
      $addFields: {
        totalPaid: { $ifNull: [{ $arrayElemAt: ['$payments.totalPaid', 0] }, 0] },
        lastPaymentDate: { $arrayElemAt: ['$payments.lastPaymentDate', 0] },
        totalAmount: { $multiply: ['$totalScans', '$_id.rate'] },
        lastPaymentDay: {
          $dateTrunc: {
            date: { $ifNull: [{ $arrayElemAt: ['$payments.lastPaymentDate', 0] }, new Date(0)] },
            unit: 'day',
          },
        },
        noOfDays: {
          $size: {
            $filter: {
              input: { $ifNull: ['$workedDays', []] },
              as: 'd',
              cond: {
                $gt: ['$$d', {
                  $dateTrunc: {
                    date: { $ifNull: [{ $arrayElemAt: ['$payments.lastPaymentDate', 0] }, new Date(0)] },
                    unit: 'day',
                  },
                }],
              },
            },
          },
        },
      },
    });

    pipeline.push({
      $addFields: {
        pendingAmount: { $subtract: ['$totalAmount', '$totalPaid'] },
      },
    });

    pipeline.push({
      $match: {
        pendingAmount: { $gt: 0 },
      },
    });

    pipeline.push({
      $project: {
        _id: 0,
        operatorId: '$_id.operatorId',
        operatorName: '$_id.operatorName',
        projectId: '$_id.projectId',
        projectName: '$_id.projectName',
        rate: '$_id.rate',
        bankDetails: '$_id.bankDetails',
        panNumber: '$_id.panNumber',
        mobile: '$_id.mobile',
        center: '$_id.center',
        noOfDays: 1,
        totalScans: 1,
        totalAmount: 1,
        totalPaid: 1,
        pendingAmount: 1,
      },
    });

    const payroll = await ScanEntry.aggregate(pipeline);

    res.json(payroll);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const normalizeHeader = (value) => {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
};

const toText = (value) => {
  if (value === null || value === undefined) return '';
  return String(value).trim();
};

const digitsOnly = (value) => {
  return toText(value).replace(/\D/g, '');
};

const toNumber = (value) => {
  if (value === null || value === undefined || value === '') return 0;
  const n = Number(String(value).replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : 0;
};

const parsePayrollSheet = (buffer) => {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const sheet = sheetName ? workbook.Sheets[sheetName] : null;
  if (!sheet) return [];
  const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });

  const mappedRows = rawRows.map((row) => {
    const normalized = {};
    Object.keys(row || {}).forEach((key) => {
      const nk = normalizeHeader(key);
      normalized[nk] = row[key];
    });

    const totalPay =
      toNumber(normalized['totalpayinqtw']) ||
      toNumber(normalized['totalpayinwardscanningqcoutwardsticker']) ||
      toNumber(normalized['totalpay']) ||
      toNumber(normalized['total']);

    return {
      sNo: toText(normalized['sno'] || normalized['sno.']),
      userId: toText(normalized['userid']),
      userName: toText(normalized['username']),
      mobile: digitsOnly(normalized['mobileno'] || normalized['mobile']),
      department: toText(normalized['department']),
      source: toText(normalized['source']),
      noOfDays: toNumber(normalized['noofdays']),
      dayWisePay: toNumber(normalized['daywisepay']),
      totalPerDayPayment: toNumber(normalized['totalperdaypayment']),
      inwardCount: toNumber(normalized['inwardcount']),
      inwardPayment: toNumber(normalized['inwardpayment']),
      scanAmountPerScript: toNumber(normalized['amountperscriptscan']),
      scanCount: toNumber(normalized['scancount']),
      scanningTotalAmount: toNumber(normalized['scanningtotalamount']),
      qcAmountPerScript: toNumber(normalized['qcamountperscript']),
      qcCount: toNumber(normalized['qccount']),
      qcTotalAmount: toNumber(normalized['qctotalamount']),
      outwardAmountPerScript: toNumber(normalized['outwardamountperscript']),
      outwardCount: toNumber(normalized['outwardcount']),
      outwardTotalAmount: toNumber(normalized['outwardtotalamount']),
      stickerAmountPerScript: toNumber(normalized['stickeramountperscript']),
      stickerCount: toNumber(normalized['stickercount']),
      stickerTotalAmount: toNumber(normalized['stickertotalamount']),
      totalPay,
      statusPayHold: toText(normalized['statuspayhold'] || normalized['status']),
      aadhaarNumber: digitsOnly(normalized['aadharcardnumber'] || normalized['aadharnumber'] || normalized['aadhaar']),
      panNumber: toText(normalized['pancardnumber'] || normalized['pannumber'] || normalized['pan']),
      accountNo: toText(normalized['accountno'] || normalized['accountnumber'] || normalized['account']),
      bank: toText(normalized['bank']),
      ifscCode: toText(normalized['isfccode'] || normalized['ifsccode'] || normalized['ifsc']),
    };
  });

  return mappedRows;
};

const findStaffForPayrollRow = async (row) => {
  const userId = toText(row.userId);
  const mobile = digitsOnly(row.mobile);

  if (userId && mongoose.Types.ObjectId.isValid(userId)) {
    const staffById = await Staff.findById(userId);
    if (staffById) return staffById;
  }

  if (userId) {
    const staffByEmployeeId = await Staff.findOne({ employeeId: userId });
    if (staffByEmployeeId) return staffByEmployeeId;
  }

  if (mobile) {
    const staffByMobile = await Staff.findOne({ mobile });
    if (staffByMobile) return staffByMobile;
  }

  return null;
};

const importPayroll = async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const rows = parsePayrollSheet(req.file.buffer);
    if (!rows.length) {
      return res.status(400).json({ message: 'No data rows found in sheet' });
    }

    const results = {
      total: rows.length,
      createdPayments: 0,
      heldRows: 0,
      failed: 0,
      errors: [],
    };

    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      const rowNumber = i + 2;

      const staff = await findStaffForPayrollRow(row);
      if (!staff) {
        results.failed += 1;
        results.errors.push(`Row ${rowNumber}: staff not found (User Id: ${row.userId || '-'}, Mobile: ${row.mobile || '-'})`);
        continue;
      }

      const totalPay = toNumber(row.totalPay);
      if (!totalPay || totalPay <= 0) {
        results.failed += 1;
        results.errors.push(`Row ${rowNumber}: invalid Total Pay`);
        continue;
      }

      const statusText = normalizeHeader(row.statusPayHold);
      const isHold = statusText === 'hold' || statusText === 'onhold';

      const dedupeQuery = {
        staff: staff._id,
        amount: totalPay,
      };
      if (row.sNo) dedupeQuery['payrollDetails.sNo'] = row.sNo;
      if (row.userId) dedupeQuery['payrollDetails.userId'] = row.userId;
      if (!row.sNo && !row.userId) {
        if (row.mobile) dedupeQuery['payrollDetails.mobile'] = row.mobile;
        if (row.userName) dedupeQuery['payrollDetails.userName'] = row.userName;
      }

      const alreadyImported = await Payment.findOne(dedupeQuery).select('_id');
      if (alreadyImported) {
        continue;
      }

      await Payment.create({
        staff: staff._id,
        amount: totalPay,
        paymentMode: 'bank_transfer',
        status: isHold ? 'pending' : 'processed',
        paymentDate: new Date(),
        accountDetails: {
          accountNo: row.accountNo || staff.bankDetails?.accountNo,
          ifscCode: row.ifscCode || staff.bankDetails?.ifscCode,
          bankName: row.bank || staff.bankDetails?.bankName,
        },
        payrollDetails: {
          userId: row.userId,
          userName: row.userName,
          mobile: row.mobile,
          department: row.department,
          source: row.source,
          noOfDays: row.noOfDays,
          dayWisePay: row.dayWisePay,
          totalPerDayPayment: row.totalPerDayPayment,
          inwardCount: row.inwardCount,
          inwardPayment: row.inwardPayment,
          scanAmountPerScript: row.scanAmountPerScript,
          scanCount: row.scanCount,
          scanningTotalAmount: row.scanningTotalAmount,
          qcAmountPerScript: row.qcAmountPerScript,
          qcCount: row.qcCount,
          qcTotalAmount: row.qcTotalAmount,
          outwardAmountPerScript: row.outwardAmountPerScript,
          outwardCount: row.outwardCount,
          outwardTotalAmount: row.outwardTotalAmount,
          stickerAmountPerScript: row.stickerAmountPerScript,
          stickerCount: row.stickerCount,
          stickerTotalAmount: row.stickerTotalAmount,
          totalPay: totalPay,
          statusPayHold: row.statusPayHold,
          aadhaarNumber: row.aadhaarNumber,
          panNumber: row.panNumber,
          accountNo: row.accountNo,
          bank: row.bank,
          ifscCode: row.ifscCode,
          sNo: row.sNo,
        },
      });

      results.createdPayments += 1;
      if (isHold) results.heldRows += 1;
    }

    res.json({ message: 'Payroll import completed', results });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error during payroll import' });
  }
};

module.exports = {
  getPayroll,
  importPayroll,
};
