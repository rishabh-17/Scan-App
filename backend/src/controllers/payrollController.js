const ScanEntry = require('../models/ScanEntry');

// @desc    Get payroll report
// @route   GET /api/payroll
// @access  Private (Admin)
const getPayroll = async (req, res) => {
  try {
    // Aggregate scans by staff and project
    const payroll = await ScanEntry.aggregate([
      {
        $match: {
          status: { $in: ['project_approved', 'finance_approved', 'locked'] }, // Include pending finance approval
        },
      },
      {
        $lookup: {
          from: 'projects',
          localField: 'projectId',
          foreignField: '_id',
          as: 'project',
        },
      },
      {
        $unwind: '$project',
      },
      {
        $lookup: {
          from: 'staffs',
          localField: 'operatorId',
          foreignField: '_id',
          as: 'operator',
        },
      },
      {
        $unwind: '$operator',
      },
      {
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
      },
      {
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
          totalAmount: { $multiply: ['$totalScans', '$_id.rate'] },
        },
      },
    ]);

    res.json(payroll);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getPayroll,
};
