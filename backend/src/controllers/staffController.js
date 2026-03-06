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

        // RBAC: Center Supervisor sees only staff in their center
        if (req.user && req.user.role === 'center_supervisor') {
            // Center can be assigned via center field or via user.center
            // Based on previous interactions, center is assigned via Staff Management
            // But wait, user removed "Assigned Center" from Users page, saying it's handled in Staff Management.
            // But a Center Supervisor IS a Staff/User. So their center assignment is in their own record.
            // Let's check if req.user has center populated.
            if (req.user.center) {
                query.center = req.user.center;
            }
        }

        const staff = await Staff.find(query)
            .select('-password')
            .populate('project', 'name') // Populate project name
            .populate('center', 'name') // Populate center name
            .sort({ createdAt: -1 });
        res.json(staff);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Update staff status/role
// @route   PUT /api/staff/:id
// @access  Private/Admin/CenterSupervisor
const updateStaff = async (req, res) => {
    try {
        const staff = await Staff.findById(req.params.id);

        if (staff) {
            // RBAC: Center Supervisor checks
            if (req.user.role === 'center_supervisor') {
                // Check if staff belongs to supervisor's center
                if (!staff.center || staff.center.toString() !== req.user.center.toString()) {
                    return res.status(403).json({ message: 'Not authorized to update staff from another center' });
                }

                // Prevent changing critical fields
                if (req.body.role && req.body.role !== 'staff') {
                    return res.status(403).json({ message: 'Center Supervisors can only manage Staff role' });
                }
                if (req.body.center && req.body.center !== req.user.center.toString()) {
                    return res.status(403).json({ message: 'Cannot move staff to another center' });
                }
            }

            staff.name = req.body.name || staff.name;
            staff.mobile = req.body.mobile || staff.mobile;
            staff.email = req.body.email || staff.email;

            // Allow role update if admin, or if supervisor (but restricted above)
            if (req.user.role === 'admin') {
                staff.role = req.body.role || staff.role;
                staff.center = req.body.center || staff.center;
            }

            staff.status = req.body.status || staff.status;
            staff.project = req.body.project || staff.project;
            staff.employeeId = req.body.employeeId || staff.employeeId;

            // New fields
            if (req.body.dob) staff.dob = req.body.dob;
            if (req.body.address) staff.address = req.body.address;
            if (req.body.city) staff.city = req.body.city;
            if (req.body.state) staff.state = req.body.state;
            if (req.body.pincode) staff.pincode = req.body.pincode;
            if (req.body.aadhaarNumber) staff.aadhaarNumber = req.body.aadhaarNumber;
            if (req.body.panNumber) staff.panNumber = req.body.panNumber;

            // Handle files
            if (req.files && req.files['aadhaarDoc']) staff.aadhaarDoc = req.files['aadhaarDoc'][0].path;
            if (req.files && req.files['panDoc']) staff.panDoc = req.files['panDoc'][0].path;

            if (req.body.bankDetails) {
                let parsedBankDetails = {};
                if (typeof req.body.bankDetails === 'string') {
                    try {
                        parsedBankDetails = JSON.parse(req.body.bankDetails);
                    } catch (e) { }
                } else {
                    parsedBankDetails = req.body.bankDetails;
                }

                staff.bankDetails = {
                    ...(staff.bankDetails || {}),
                    ...parsedBankDetails
                };
            }

            if (req.files && req.files['cancelledChequeDoc']) {
                if (!staff.bankDetails) staff.bankDetails = {};
                staff.bankDetails.cancelledChequeDoc = req.files['cancelledChequeDoc'][0].path;
            }

            if (req.body.password) {
                const salt = await bcrypt.genSalt(10);
                staff.password = await bcrypt.hash(req.body.password, salt);
            }

            const updatedStaff = await staff.save();

            // Re-fetch to populate project
            const populatedStaff = await Staff.findById(updatedStaff._id).populate('project', 'name');

            res.json(populatedStaff);
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

// @desc    Create new staff/user (Admin/CenterSupervisor)
// @route   POST /api/staff
// @access  Private/Admin/CenterSupervisor
const createStaff = async (req, res) => {
    let {
        name, mobile, email, password, role, center, project, employeeId,
        dob, address, city, state, pincode, aadhaarNumber, panNumber,
        bankDetails
    } = req.body;

    if (!name || !mobile || !password) {
        return res.status(400).json({ message: 'Please add all required fields (Name, Mobile, Password)' });
    }

    // RBAC: Center Supervisor enforcement
    if (req.user.role === 'center_supervisor') {
        if (!req.user.center) {
            return res.status(400).json({ message: 'Supervisor has no assigned center' });
        }
        center = req.user.center; // Force center
        role = 'staff'; // Force role
    }

    // Require employeeId only for 'staff' role
    if ((!role || role === 'staff') && !employeeId) {
        return res.status(400).json({ message: 'Please add Employee ID' });
    }

    try {
        // Build duplicate check query
        const duplicateQuery = [{ mobile }];
        if (employeeId) {
            duplicateQuery.push({ employeeId });
        }

        const staffExists = await Staff.findOne({ $or: duplicateQuery });

        if (staffExists) {
            return res.status(400).json({ message: 'Staff with this mobile or employee ID already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Handle files
        const aadhaarDoc = req.files && req.files['aadhaarDoc'] ? req.files['aadhaarDoc'][0].path : undefined;
        const panDoc = req.files && req.files['panDoc'] ? req.files['panDoc'][0].path : undefined;
        const cancelledChequeDoc = req.files && req.files['cancelledChequeDoc'] ? req.files['cancelledChequeDoc'][0].path : undefined;

        let parsedBankDetails = bankDetails;
        if (typeof bankDetails === 'string') {
            try {
                parsedBankDetails = JSON.parse(bankDetails);
            } catch (e) {
                // console.error("Error parsing bankDetails", e);
            }
        }

        const staff = await Staff.create({
            name,
            mobile,
            email,
            password: hashedPassword,
            role: role || 'staff',
            status: 'active',
            center: center || undefined, // Handle empty string
            project: project || undefined, // Handle empty string
            employeeId,
            dob,
            address,
            city,
            state,
            pincode,
            aadhaarNumber,
            aadhaarDoc,
            panNumber,
            panDoc,
            bankDetails: {
                ...(parsedBankDetails || {}),
                cancelledChequeDoc
            }
        });

        if (staff) {
            res.status(201).json({
                _id: staff.id,
                name: staff.name,
                mobile: staff.mobile,
                email: staff.email,
                role: staff.role,
                status: staff.status,
            });
        } else {
            res.status(400).json({ message: 'Invalid staff data' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

const getStaffById = async (req, res) => {
    try {
        const staff = await Staff.findById(req.params.id)
            .select('-password')
            .populate('project', 'name center scanRate');

        if (staff) {
            res.json(staff);
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
    getStaffById,
    updateStaff,
    deleteStaff,
    createStaff
};
