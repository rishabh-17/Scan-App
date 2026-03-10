const ScanEntry = require('../models/ScanEntry');
const mongoose = require('mongoose');

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
                  { $ne: ['$status', 'failed'] },
                ],
              },
            },
          },
          {
            $group: {
              _id: null,
              totalPaid: { $sum: '$amount' },
            },
          },
        ],
        as: 'payments',
      },
    });

    pipeline.push({
      $addFields: {
        totalPaid: { $ifNull: [{ $arrayElemAt: ['$payments.totalPaid', 0] }, 0] },
        totalAmount: { $multiply: ['$totalScans', '$_id.rate'] },
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

module.exports = {
  getPayroll,
};
