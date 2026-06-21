const Staff = require('../models/Staff');
const Center = require('../models/Center');
const bcrypt = require('bcryptjs');
const XLSX = require('xlsx');

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

        // RBAC: Center Supervisor sees only staff in their center(s)
        if (req.user && req.user.role === 'center_supervisor') {
            // Find all centers where this user is a supervisor
            const managedCenters = await Center.find({ supervisors: req.user._id }).select('_id');
            const centerIds = managedCenters.map(c => c._id);

            if (centerIds.length > 0) {
                query.center = { $in: centerIds };
            } else {
                // If supervisor has no centers, they see no staff (or maybe just unassigned? No, safer to show none)
                return res.json([]);
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
                // Find all centers where this user is a supervisor
                const managedCenters = await Center.find({ supervisors: req.user._id }).select('_id');
                const centerIds = managedCenters.map(c => c._id.toString());

                if (centerIds.length === 0) {
                    return res.status(403).json({ message: 'Supervisor has no assigned center' });
                }

                // Check if staff belongs to supervisor's center
                if (!staff.center || !centerIds.includes(staff.center.toString())) {
                    return res.status(403).json({ message: 'Not authorized to update staff from another center' });
                }

                // Prevent changing critical fields
                if (req.body.role && req.body.role !== 'staff') {
                    return res.status(403).json({ message: 'Center Supervisors can only manage Staff role' });
                }
                if (req.body.center && !centerIds.includes(req.body.center.toString())) {
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

            // Password update only by admin (or via reset password flow)
            if (req.body.password && req.user.role === 'admin') {
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
        const managedCenters = await Center.find({ supervisors: req.user._id }).select('_id');
        const centerIds = managedCenters.map(c => c._id.toString());

        if (centerIds.length === 0) {
            return res.status(403).json({ message: 'Supervisor has no assigned center' });
        }

        if (!center) {
            // If only one center, default to it
            if (centerIds.length === 1) {
                center = centerIds[0];
            } else {
                return res.status(400).json({ message: 'Please select a center' });
            }
        } else {
            // Verify selected center is managed by supervisor
            if (!centerIds.includes(center)) {
                return res.status(403).json({ message: 'Not authorized to add staff to this center' });
            }
        }

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
            .populate('project', 'name center scanRate')
            .populate('center', 'name centerCode location');

        if (staff) {
            if (req.user && req.user.role === 'center_supervisor') {
                const managedCenters = await Center.find({ supervisors: req.user._id }).select('_id');
                const centerIds = managedCenters.map((c) => c._id.toString());

                if (!staff.center || !centerIds.includes(staff.center._id.toString())) {
                    return res.status(403).json({ message: 'Not authorized to view staff from another center' });
                }
            }
            res.json(staff);
        } else {
            res.status(404).json({ message: 'Staff not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Reset staff password
// @route   PUT /api/staff/:id/reset-password
// @access  Private/Admin
const resetPassword = async (req, res) => {
    try {
        const staff = await Staff.findById(req.params.id);

        if (!staff) {
            return res.status(404).json({ message: 'Staff not found' });
        }

        if (!req.body.password) {
            return res.status(400).json({ message: 'Please provide a password' });
        }

        // Generate salt
        const salt = await bcrypt.genSalt(10);
        // Hash password
        staff.password = await bcrypt.hash(req.body.password, salt);

        await staff.save();

        res.json({ message: 'Password updated successfully' });
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

const importStaff = async (req, res) => {
    try {
        if (!req.file || !req.file.buffer) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) {
            return res.status(400).json({ message: 'No sheet found in file' });
        }

        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });
        if (!Array.isArray(rows) || rows.length === 0) {
            return res.status(400).json({ message: 'No data rows found in sheet' });
        }

        const headerKeyMap = {
            sno: 'sNo',
            employeeid: 'employeeId',
            empid: 'employeeId',
            centreid: 'centerId',
            centerid: 'centerId',
            location: 'location',
            name: 'name',
            gender: 'gender',
            fathername: 'fatherName',
            mothername: 'motherName',
            bloodgroup: 'bloodGroup',
            mobileno: 'mobile',
            mobile: 'mobile',
            mobilenumber: 'mobile',
            alternatenumbermandatory: 'alternateMobile',
            alternatenumber: 'alternateMobile',
            alternatemobile: 'alternateMobile',
            emailid: 'email',
            email: 'email',
            aadharnumber: 'aadhaarNumber',
            aadhaarnumber: 'aadhaarNumber',
            pannumber: 'panNumber',
            pan: 'panNumber',
            bankname: 'bankName',
            ifsccode: 'ifscCode',
            accountnumber: 'accountNo',
            presentaddress: 'address',
            highesteducation: 'highestEducation',
            affliateduniversty: 'affiliatedUniversity',
            affiliateduniversity: 'affiliatedUniversity',
            priviousemployemenyifany: 'previousEmployment',
            previousemploymentifany: 'previousEmployment',
            previousemployment: 'previousEmployment',
            reference: 'referenceSource',
            referencedirectwalkinagency: 'referenceSource',
            ifagencyagencyname: 'agencyName',
            agencyname: 'agencyName',
            referencecontactnoanyonefromyourpastacadamicfaculty: 'referenceContactNo',
            referencecontactno: 'referenceContactNo',
            aadhar: 'aadhaarDoc',
            aadhardoc: 'aadhaarDoc',
            pancard: 'panDoc',
            bankpassbook: 'bankPassbookDoc',
            passportsizephoto: 'photo',
            educationaldoc: 'educationalDoc',
        };

        const normalizedRows = rows.map((row) => {
            const normalized = {};
            Object.keys(row || {}).forEach((key) => {
                const mapped = headerKeyMap[normalizeHeader(key)];
                if (!mapped) return;
                normalized[mapped] = row[key];
            });
            return normalized;
        });

        const centers = await Center.find({}).select('_id name centerCode location');
        const centerLookup = new Map();
        centers.forEach((c) => {
            const nameKey = normalizeHeader(c.name);
            if (nameKey) centerLookup.set(nameKey, c._id.toString());
            const codeKey = normalizeHeader(c.centerCode);
            if (codeKey) centerLookup.set(codeKey, c._id.toString());
            const locKey = normalizeHeader(c.location);
            if (locKey) centerLookup.set(locKey, c._id.toString());
        });

        let allowedCenterIds = null;
        if (req.user && req.user.role === 'center_supervisor') {
            const managedCenters = await Center.find({ supervisors: req.user._id }).select('_id');
            allowedCenterIds = new Set(managedCenters.map((c) => c._id.toString()));
        }

        const mobiles = normalizedRows.map(r => digitsOnly(r.mobile)).filter(Boolean);
        const existing = await Staff.find({ mobile: { $in: mobiles } });
        const existingByMobile = new Map(existing.map((s) => [s.mobile, s]));

        const salt = await bcrypt.genSalt(10);
        const defaultPasswordHash = await bcrypt.hash('123456', salt);

        let created = 0;
        let updated = 0;
        const failures = [];

        for (let i = 0; i < normalizedRows.length; i += 1) {
            const rowNumber = i + 2;
            const r = normalizedRows[i] || {};

            const name = toText(r.name);
            const mobile = digitsOnly(r.mobile);
            const alternateMobile = digitsOnly(r.alternateMobile);
            const employeeIdText = toText(r.employeeId);

            if (!name || !mobile || !alternateMobile) {
                failures.push({ rowNumber, reason: 'Missing required fields (Name, Mobile No, Alternate Number)' });
                continue;
            }

            if (!employeeIdText) {
                failures.push({ rowNumber, reason: 'Missing required field (Employee ID)' });
                continue;
            }

            const locationText = toText(r.location);
            const centerRaw = toText(r.centerId);
            if (!centerRaw && !locationText) {
                failures.push({ rowNumber, reason: 'Missing required field (Centre ID)' });
                continue;
            }

            const centerId = /^[0-9a-fA-F]{24}$/.test(centerRaw)
                ? centerRaw
                : (centerRaw ? centerLookup.get(normalizeHeader(centerRaw)) : (locationText ? centerLookup.get(normalizeHeader(locationText)) : undefined));

            if (!centerId) {
                failures.push({ rowNumber, reason: 'Centre ID/Location does not match any center' });
                continue;
            }

            if (allowedCenterIds && !centerId) {
                failures.push({ rowNumber, reason: 'Centre ID/Location does not match an assigned center' });
                continue;
            }

            if (allowedCenterIds && centerId && !allowedCenterIds.has(centerId)) {
                failures.push({ rowNumber, reason: 'Not authorized to import staff for this center' });
                continue;
            }

            const bankDetailsPatch = {
                accountNo: toText(r.accountNo) || undefined,
                ifscCode: toText(r.ifscCode) || undefined,
                bankName: toText(r.bankName) || undefined,
            };

            const hasBankDetails = Object.values(bankDetailsPatch).some((v) => v !== undefined);

            const patch = {
                name,
                mobile,
                alternateMobile,
                email: toText(r.email) || undefined,
                location: locationText || undefined,
                employeeId: employeeIdText || undefined,
                gender: toText(r.gender) || undefined,
                fatherName: toText(r.fatherName) || undefined,
                motherName: toText(r.motherName) || undefined,
                bloodGroup: toText(r.bloodGroup) || undefined,
                aadhaarNumber: digitsOnly(r.aadhaarNumber) || undefined,
                panNumber: toText(r.panNumber) || undefined,
                address: toText(r.address) || undefined,
                highestEducation: toText(r.highestEducation) || undefined,
                affiliatedUniversity: toText(r.affiliatedUniversity) || undefined,
                previousEmployment: toText(r.previousEmployment) || undefined,
                referenceSource: toText(r.referenceSource) || undefined,
                agencyName: toText(r.agencyName) || undefined,
                referenceContactNo: toText(r.referenceContactNo) || undefined,
                photo: toText(r.photo) || undefined,
                educationalDoc: toText(r.educationalDoc) || undefined,
                bankPassbookDoc: toText(r.bankPassbookDoc) || undefined,
                aadhaarDoc: toText(r.aadhaarDoc) || undefined,
                panDoc: toText(r.panDoc) || undefined,
                bankDetails: hasBankDetails ? { ...bankDetailsPatch, accountHolderName: name } : undefined,
            };

            if (centerId) patch.center = centerId;

            const existingStaff = existingByMobile.get(mobile);
            if (existingStaff) {
                Object.keys(patch).forEach((k) => {
                    if (patch[k] === undefined) return;
                    if (k === 'bankDetails') {
                        existingStaff.bankDetails = {
                            ...(existingStaff.bankDetails || {}),
                            ...(patch.bankDetails || {}),
                        };
                        return;
                    }
                    existingStaff[k] = patch[k];
                });

                try {
                    await existingStaff.save();
                    updated += 1;
                } catch (e) {
                    failures.push({ rowNumber, reason: e.message || 'Failed to update staff' });
                }
                continue;
            }

            const staffDoc = new Staff({
                ...patch,
                role: 'staff',
                status: 'pending',
                employeeId: employeeIdText,
                password: defaultPasswordHash,
            });

            try {
                const saved = await staffDoc.save();
                existingByMobile.set(mobile, saved);
                created += 1;
            } catch (e) {
                failures.push({ rowNumber, reason: e.message || 'Failed to create staff' });
            }
        }

        res.json({
            totalRows: normalizedRows.length,
            created,
            updated,
            failed: failures.length,
            failures,
        });
    } catch (error) {
        res.status(500).json({ message: error.message || 'Server error' });
    }
};

module.exports = {
    getAllStaff,
    getStaffById,
    updateStaff,
    deleteStaff,
    createStaff,
    resetPassword,
    importStaff
};
