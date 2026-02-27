const Staff = require('../models/Staff');
const bcrypt = require('bcryptjs');

// @desc    Get all staff
// @route   GET /api/staff
// @access  Private/Admin
const getAllStaff = async (req, res) => {
    try {
        let query = {};

        // Filter by role if provided
        if (req.query.role) {
            query.role = req.query.role;
        }

        // Exclude role if provided
        if (req.query.excludeRole) {
            query.role = { $ne: req.query.excludeRole };
        }

        const staff = await Staff.find(query)
            .select('-password')
            .populate('project', 'name') // Populate project name
            .sort({ createdAt: -1 });
        res.json(staff);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Update staff status/role
// @route   PUT /api/staff/:id
// @access  Private/Admin
const updateStaff = async (req, res) => {
    try {
        const staff = await Staff.findById(req.params.id);

        if (staff) {
            staff.name = req.body.name || staff.name;
            staff.mobile = req.body.mobile || staff.mobile;
            staff.role = req.body.role || staff.role;
            staff.status = req.body.status || staff.status;
            staff.center = req.body.center || staff.center;

            // New fields
            if (req.body.employeeId) staff.employeeId = req.body.employeeId;
            if (req.body.scannerId) staff.scannerId = req.body.scannerId;
            if (req.body.project) staff.project = req.body.project; // Expecting projectId
            if (req.body.address) staff.address = req.body.address;

            if (req.body.bankDetails) {
                staff.bankDetails = {
                    accountNo: req.body.bankDetails.accountNo || staff.bankDetails?.accountNo,
                    ifscCode: req.body.bankDetails.ifscCode || staff.bankDetails?.ifscCode,
                };
            }

            if (req.body.password) {
                const salt = await bcrypt.genSalt(10);
                staff.password = await bcrypt.hash(req.body.password, salt);
            }

            const updatedStaff = await staff.save();

            // Re-fetch to populate project
            const populatedStaff = await Staff.findById(updatedStaff._id).populate('project', 'name');

            res.json({
                _id: populatedStaff._id,
                name: populatedStaff.name,
                mobile: populatedStaff.mobile,
                employeeId: populatedStaff.employeeId,
                scannerId: populatedStaff.scannerId,
                role: populatedStaff.role,
                status: populatedStaff.status,
                center: populatedStaff.center,
                project: populatedStaff.project,
                bankDetails: populatedStaff.bankDetails,
                address: populatedStaff.address,
            });
        } else {
            res.status(404).json({ message: 'Staff not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Delete staff
// @route   DELETE /api/staff/:id
// @access  Private/Admin
const deleteStaff = async (req, res) => {
    try {
        const staff = await Staff.findById(req.params.id);

        if (staff) {
            await staff.deleteOne();
            res.json({ message: 'Staff removed' });
        } else {
            res.status(404).json({ message: 'Staff not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    getAllStaff,
    updateStaff,
    deleteStaff,
};
