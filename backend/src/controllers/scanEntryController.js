const ScanEntry = require('../models/ScanEntry');
const Project = require('../models/Project');

// ... (createScanEntry and getMyEntries remain same)
const createScanEntry = async (req, res) => {
  const { projectId, scans, date } = req.body;

  if (!projectId || !scans) {
    return res.status(400).json({ message: 'Please provide project ID and scan count' });
  }

  try {
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const scanEntry = await ScanEntry.create({
      operatorId: req.user.id,
      projectId,
      scans,
      date: date || Date.now(),
      status: 'entered',
      auditTrail: [{
        action: 'Created',
        by: req.user.id,
        details: `Entry created with ${scans} scans`,
      }],
    });

    res.status(201).json(scanEntry);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getMyEntries = async (req, res) => {
  try {
    const entries = await ScanEntry.find({ operatorId: req.user.id })
      .populate('projectId', 'name')
      .sort({ date: -1 });
    res.json(entries);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Generic approval function
const approveEntry = async (req, res, level) => {
  try {
    const entry = await ScanEntry.findById(req.params.id);

    if (!entry) {
      return res.status(404).json({ message: 'Entry not found' });
    }

    // Role checks
    const canApprove =
      req.user.role === 'admin' ||
      (level === 'supervisor' && req.user.role === 'supervisor') ||
      (level === 'center' && req.user.role === 'center_manager') ||
      (level === 'project' && req.user.role === 'project_manager') ||
      (level === 'finance' && req.user.role === 'finance_manager');

    if (!canApprove) {
      return res.status(403).json({ message: 'Not authorized to approve at this level' });
    }

    // Status logic
    let nextStatus = entry.status;
    let actionName = '';

    if (level === 'supervisor') {
      nextStatus = 'supervisor_verified';
      actionName = 'Supervisor Verified';
    } else if (level === 'center') {
      if (entry.status !== 'supervisor_verified') return res.status(400).json({ message: 'Must be supervisor verified first' });
      nextStatus = 'center_approved';
      actionName = 'Center Approved';
    } else if (level === 'project') {
      if (entry.status !== 'center_approved') return res.status(400).json({ message: 'Must be center approved first' });
      nextStatus = 'project_approved';
      actionName = 'Project Approved';
    } else if (level === 'finance') {
      if (entry.status !== 'project_approved') return res.status(400).json({ message: 'Must be project approved first' });
      nextStatus = 'finance_approved';
      actionName = 'Finance Approved';
    }

    entry.status = nextStatus;
    entry.approvals[level] = {
      approved: true,
      by: req.user.id,
      date: Date.now(),
    };
    entry.auditTrail.push({
      action: actionName,
      by: req.user.id,
      details: `${actionName} by ${req.user.name}`,
    });

    await entry.save();
    res.json(entry);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const verifyEntry = (req, res) => approveEntry(req, res, 'supervisor');
const centerApprove = (req, res) => approveEntry(req, res, 'center');
const projectApprove = (req, res) => approveEntry(req, res, 'project');
const financeApprove = (req, res) => approveEntry(req, res, 'finance');

// Get pending approvals
const getPendingEntries = async (req, res) => {
  try {
    let query = { status: { $ne: 'locked' } };

    // Role-based filtering
    if (req.user.role === 'supervisor') {
      query.status = 'entered';
    } else if (req.user.role === 'center_manager') {
      query.status = 'supervisor_verified';
    } else if (req.user.role === 'project_manager') {
      query.status = 'center_approved';
    } else if (req.user.role === 'finance_manager') {
      query.status = 'project_approved';
    }
    // Admin sees all

    const entries = await ScanEntry.find(query)
      .populate('operatorId', 'name mobile')
      .populate('projectId', 'name center')
      .sort({ date: -1 });
    res.json(entries);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
}

module.exports = {
  createScanEntry,
  getMyEntries,
  verifyEntry,
  centerApprove,
  projectApprove,
  financeApprove,
  getPendingEntries
};
