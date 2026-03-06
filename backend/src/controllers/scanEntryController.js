const ScanEntry = require('../models/ScanEntry');
const Project = require('../models/Project');
const Center = require('../models/Center');
const Staff = require('../models/Staff');

// ... (createScanEntry and getMyEntries remain same)
const createScanEntry = async (req, res) => {
  const { projectId, scans, date, activityType } = req.body;

  if (!projectId || !scans) {
    return res.status(400).json({ message: 'Please provide project ID and scan count' });
  }

  try {
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Determine rate and amount
    let rate = project.scanRate;
    const type = activityType || 'Scanning';

    if (project.rateChart && project.rateChart.length > 0) {
      const rateItem = project.rateChart.find(r => r.activityName === type && r.status === 'active');
      if (rateItem) {
        rate = rateItem.rate;
      }
    }

    const amount = scans * rate;

    // Determine centerId from user's assigned center
    let centerId = null;
    if (req.user.center) {
      centerId = req.user.center;
    }

    const scanEntry = await ScanEntry.create({
      operatorId: req.user.id,
      projectId,
      centerId,
      activityType: type,
      amount,
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

const { createActor } = require('xstate');
const scanEntryMachine = require('../workflows/scanEntryWorkflow');
const workflowConfig = require('../workflows/workflow.json');

// Helper to find statuses that a role can approve
const getApprovableStatuses = (role) => {
  const statuses = [];
  for (const [stateName, stateDef] of Object.entries(workflowConfig.states)) {
    const transitions = stateDef.on;
    if (transitions && transitions.APPROVE) {
      const guard = transitions.APPROVE.guard;
      if (guard && guard.type === 'checkRole' && guard.params && guard.params.role === role) {
        statuses.push(stateName);
      }
    }
  }
  return statuses;
};

// Generic approval function (dynamic)
const approveEntry = async (req, res, level) => {
  try {
    const entry = await ScanEntry.findById(req.params.id);

    if (!entry) {
      return res.status(404).json({ message: 'Entry not found' });
    }

    // Initialize actor with current state via snapshot
    // We construct a minimal valid snapshot for XState v5
    const actor = createActor(scanEntryMachine, {
      snapshot: {
        status: 'active',
        output: undefined,
        error: undefined,
        value: entry.status,
        context: { user: req.user, entry: entry },
        children: {},
        historyValue: {}
      }
    });

    actor.start();

    // Send generic APPROVE event
    // The machine determines if transition is valid based on guards
    actor.send({ type: 'APPROVE' });
    const nextSnapshot = actor.getSnapshot();

    if (nextSnapshot.value === entry.status) {
      // Status didn't change, meaning transition failed (guard or invalid event)
      return res.status(400).json({ message: `Cannot perform approval on status ${entry.status} or unauthorized.` });
    }

    // Apply updates
    entry.status = nextSnapshot.value;

    // Determine action name and approval field based on new state
    let actionName = `Approved to ${entry.status}`;
    let approvalField = '';

    // Dynamic mapping: "supervisor_verified" -> "supervisor", "center_approved" -> "center"
    const match = entry.status.match(/^(.+)_(approved|verified)$/);
    if (match) {
      approvalField = match[1];
      // Capitalize for Action Name
      const roleName = approvalField.charAt(0).toUpperCase() + approvalField.slice(1);
      const actionType = match[2] === 'verified' ? 'Verified' : 'Approved';
      actionName = `${roleName} ${actionType}`;
    }

    if (approvalField) {
      const approvalData = {
        approved: true,
        by: req.user.id,
        date: Date.now(),
      };

      if (entry.approvals instanceof Map) {
        entry.approvals.set(approvalField, approvalData);
      } else {
        // Fallback if not Map (though schema defines it as Map)
        if (!entry.approvals) entry.approvals = {};
        entry.approvals[approvalField] = approvalData;
      }
    }

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

// Reject entry
const rejectEntry = async (req, res) => {
  try {
    const { reason } = req.body;
    const entry = await ScanEntry.findById(req.params.id);

    if (!entry) {
      return res.status(404).json({ message: 'Entry not found' });
    }

    // Check transition using XState Actor
    const actor = createActor(scanEntryMachine, {
      snapshot: {
        status: 'active',
        output: undefined,
        error: undefined,
        value: entry.status,
        context: { user: req.user, entry: entry },
        children: {},
        historyValue: {}
      }
    });
    actor.start();
    actor.send({ type: 'REJECT' });
    const nextSnapshot = actor.getSnapshot();

    if (nextSnapshot.value === entry.status) {
      return res.status(400).json({ message: `Cannot reject entry in status ${entry.status} or unauthorized.` });
    }

    entry.status = nextSnapshot.value;
    entry.rejectionReason = reason || 'Rejected by ' + req.user.role;

    entry.auditTrail.push({
      action: 'Rejected',
      by: req.user.id,
      details: `Rejected by ${req.user.name} (${req.user.role}). Reason: ${reason}`,
      date: Date.now()
    });

    await entry.save();
    res.json(entry);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get entries (pending or approved)
const getPendingEntries = async (req, res) => {
  try {
    const { type } = req.query;
    let query = {};

    if (type === 'approved') {
      // Show entries that have been approved by this role
      if (req.user.role === 'admin') {
        const finalStates = Object.entries(workflowConfig.states)
          .filter(([_, def]) => def.type === 'final')
          .map(([name, _]) => name);
        query.status = { $in: finalStates }; // Admin sees completed entries
      } else {
        let approvalField = '';

        // Map roles to approval fields
        if (req.user.role === 'center_supervisor') approvalField = 'center';
        else if (req.user.role === 'project_manager') approvalField = 'project';
        else if (req.user.role === 'finance_hr') approvalField = 'finance';

        if (approvalField) {
          query[`approvals.${approvalField}.approved`] = true;
        }
      }
    } else {
      // Pending approvals
      query = { status: { $ne: 'locked' } };

      if (req.user.role === 'admin' || req.user.role === 'finance_hr') {
        const finalStates = Object.entries(workflowConfig.states)
          .filter(([_, def]) => def.type === 'final')
          .map(([name, _]) => name);
        query.status = { $nin: finalStates };
      } else {
        // Filter by Assigned Scope
        if (req.user.role === 'center_supervisor') {
          if (req.user.center) {
            query.centerId = req.user.center;
          } else {
            // Fallback: Check if assigned as supervisor in Center model
            const centers = await Center.find({ supervisors: req.user._id });
            if (centers.length > 0) {
              const centerIds = centers.map(c => c._id);
              query.centerId = { $in: centerIds };
            } else {
              return res.json([]);
            }
          }
        } else if (req.user.role === 'project_manager') {
          if (req.user.project) {
            query.projectId = req.user.project;
          } else {
            // Fallback: Check if assigned as manager in Project model (Legacy)
            const projects = await Project.find({ managers: req.user._id });
            if (projects.length > 0) {
              const projectIds = projects.map(p => p._id);
              query.projectId = { $in: projectIds };
            } else {
              return res.json([]);
            }
          }
        }

        const approvableStatuses = getApprovableStatuses(req.user.role);
        if (approvableStatuses.length > 0) {
          query.status = { $in: approvableStatuses };
        } else {
          // No pending approvals for this role
          return res.json([]);
        }
      }
    }

    const entries = await ScanEntry.find(query)
      .populate('operatorId', 'name mobile')
      .populate('projectId', 'name center')
      .sort({ date: -1 })
      .lean();

    // Enrich entries with available actions for the current user
    const entriesWithActions = entries.map(entry => {
      try {
        const actor = createActor(scanEntryMachine, {
          snapshot: {
            status: 'active',
            output: undefined,
            error: undefined,
            value: entry.status,
            context: { user: req.user, entry: entry },
            children: {},
            historyValue: {}
          }
        });
        actor.start();
        const snapshot = actor.getSnapshot();

        const actions = [];
        // Check if snapshot has .can method (safety check)
        if (snapshot && typeof snapshot.can === 'function') {
          if (snapshot.can({ type: 'APPROVE' })) actions.push('APPROVE');
          if (snapshot.can({ type: 'REJECT' })) actions.push('REJECT');
        } else {
          console.warn(`Snapshot for entry ${entry._id} is invalid or missing .can method`, snapshot);
        }

        return { ...entry, actions };
      } catch (err) {
        console.error(`Error processing actions for entry ${entry._id}:`, err.message);
        return { ...entry, actions: [] }; // Fallback to no actions
      }
    });

    res.json(entriesWithActions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
}

// Get Dashboard Stats
const getStats = async (req, res) => {
  try {
    let query = {};

    // RBAC: Scope to user's assigned projects/centers
    if (req.user.role === 'project_manager') {
      if (req.user.project) {
        query.projectId = req.user.project;
      } else {
        // Fallback: Check if assigned as manager in Project model (Legacy)
        const projects = await Project.find({ managers: req.user._id });
        if (projects.length > 0) {
          const projectIds = projects.map(p => p._id);
          query.projectId = { $in: projectIds };
        } else {
          // No project assigned, return empty stats
          return res.json({
            totalUnits: 0,
            totalAmount: 0,
            pendingCount: 0,
            approvedCount: 0,
            rejectedCount: 0
          });
        }
      }
    } else if (req.user.role === 'center_supervisor') {
      if (req.user.center) {
        query.centerId = req.user.center;
      } else {
        // Fallback: Check if assigned as supervisor in Center model
        const centers = await Center.find({ supervisors: req.user._id });
        if (centers.length > 0) {
          const centerIds = centers.map(c => c._id);
          query.centerId = { $in: centerIds };
        } else {
          return res.json({
            totalUnits: 0,
            totalAmount: 0,
            pendingCount: 0,
            approvedCount: 0,
            rejectedCount: 0
          });
        }
      }
    }

    const stats = await ScanEntry.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalUnits: { $sum: "$scans" },
          totalAmount: { $sum: "$amount" },
          pendingCount: {
            $sum: {
              $cond: [{
                $and: [
                  { $ne: ["$status", "finance_approved"] },
                  { $ne: ["$status", "rejected"] }
                ]
              }, 1, 0]
            }
          },
          approvedCount: {
            $sum: { $cond: [{ $eq: ["$status", "finance_approved"] }, 1, 0] }
          },
          rejectedCount: {
            $sum: { $cond: [{ $eq: ["$status", "rejected"] }, 1, 0] }
          }
        }
      }
    ]);

    const result = stats[0] || {
      totalUnits: 0,
      totalAmount: 0,
      pendingCount: 0,
      approvedCount: 0,
      rejectedCount: 0
    };

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Validate bulk upload data
// @route   POST /api/scan-entry/bulk-validate
// @access  Private (Supervisor/Manager)
const validateBulkUpload = async (req, res) => {
  const { rows } = req.body;
  if (!rows || !Array.isArray(rows)) {
    return res.status(400).json({ message: 'Invalid data format' });
  }

  const errors = [];
  const validRows = [];

  // Cache for lookups to avoid repeated DB calls
  const projectCache = {};
  const centerCache = {};
  const staffCache = {};

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowErrors = [];
    const { staffId, projectCode, centerCode, activityType, workDate, unitsCompleted } = row;

    // 1. Validate Project Code
    let project = projectCache[projectCode];
    if (!project) {
      project = await Project.findOne({ projectCode });
      if (project) projectCache[projectCode] = project;
    }
    if (!project) {
      rowErrors.push(`Project Code '${projectCode}' not found`);
    } else if (req.user.role === 'project_manager') {
      // RBAC: Check if Project Manager is assigned to this project
      if (!req.user.project || !req.user.project.equals(project._id)) {
        rowErrors.push(`You are not assigned to project '${projectCode}'`);
      }
    }

    // 2. Validate Center Code
    let center = centerCache[centerCode];
    if (!center) {
      center = await Center.findOne({ centerCode });
      if (center) centerCache[centerCode] = center;
    }
    if (!center) {
      rowErrors.push(`Center Code '${centerCode}' not found`);
    } else if (req.user.role === 'center_supervisor') {
      // RBAC: Check if Center Supervisor is assigned to this center
      if (!req.user.center || !req.user.center.equals(center._id)) {
        rowErrors.push(`You are not assigned to center '${centerCode}'`);
      }
    }

    // 3. Validate Staff ID
    let staff = staffCache[staffId];
    if (!staff) {
      staff = await Staff.findOne({ employeeId: staffId });
      if (staff) staffCache[staffId] = staff;
    }
    if (!staff) {
      rowErrors.push(`Staff ID '${staffId}' not found`);
    }

    // 4. Validate Activity Type
    if (project) {
      let isValidActivity = false;
      let validActivities = ['Scanning']; // Default valid activity

      if (project.rateChart && project.rateChart.length > 0) {
        const activeRates = project.rateChart
          .filter(r => r.status === 'active')
          .map(r => r.activityName);
        validActivities = [...validActivities, ...activeRates];
      }

      if (validActivities.includes(activityType) || (!activityType && validActivities.includes('Scanning'))) {
        isValidActivity = true;
      }

      if (!isValidActivity) {
        rowErrors.push(`Activity Type '${activityType}' not valid for project '${projectCode}'. Valid options: ${validActivities.join(', ')}`);
      }
    }

    // 5. Validate Date
    if (!Date.parse(workDate)) {
      rowErrors.push(`Invalid Work Date '${workDate}'`);
    }

    // 6. Validate Units
    if (isNaN(unitsCompleted) || unitsCompleted <= 0) {
      rowErrors.push(`Invalid Units Completed '${unitsCompleted}'`);
    }

    if (rowErrors.length > 0) {
      errors.push({ row: i + 1, errors: rowErrors });
    } else {
      validRows.push({
        ...row,
        _project: project,
        _center: center,
        _staff: staff
      });
    }
  }

  res.json({ valid: errors.length === 0, errors, validCount: validRows.length, totalCount: rows.length });
};

// @desc    Bulk create scan entries
// @route   POST /api/scan-entry/bulk-create
// @access  Private (Supervisor/Manager)
const bulkCreateScanEntries = async (req, res) => {
  const { rows } = req.body;
  if (!rows || !Array.isArray(rows)) {
    return res.status(400).json({ message: 'Invalid data format' });
  }

  try {
    const entriesToCreate = [];

    // Re-fetch or trust frontend? Trust frontend if validated, but safer to re-lookup or use IDs if frontend sends them.
    // However, frontend sends Excel rows. We need to look up IDs again.
    // For efficiency, we can assume validation passed or just look up.

    // Optimization: Bulk fetch all codes
    const projectCodes = [...new Set(rows.map(r => r.projectCode))];
    const centerCodes = [...new Set(rows.map(r => r.centerCode))];
    const staffIds = [...new Set(rows.map(r => r.staffId))];

    const projects = await Project.find({ projectCode: { $in: projectCodes } });
    const centers = await Center.find({ centerCode: { $in: centerCodes } });
    const staffMembers = await Staff.find({ employeeId: { $in: staffIds } });

    const projectMap = projects.reduce((acc, p) => ({ ...acc, [p.projectCode]: p }), {});
    const centerMap = centers.reduce((acc, c) => ({ ...acc, [c.centerCode]: c }), {});
    const staffMap = staffMembers.reduce((acc, s) => ({ ...acc, [s.employeeId]: s }), {});

    for (const row of rows) {
      const { staffId, projectCode, centerCode, activityType, workDate, unitsCompleted, remarks } = row;

      const project = projectMap[projectCode];
      const center = centerMap[centerCode];
      const staff = staffMap[staffId];

      if (!project || !center || !staff) continue; // Skip invalid rows (should be validated before)

      // RBAC Check
      if (req.user.role === 'center_supervisor') {
        if (!req.user.center || !req.user.center.equals(center._id)) {
          continue;
        }
      }
      if (req.user.role === 'project_manager') {
        if (!req.user.project || !req.user.project.equals(project._id)) {
          continue;
        }
      }

      // Calculate Amount
      let rate = project.scanRate;
      if (activityType && activityType !== 'Scanning' && project.rateChart) {
        const rateItem = project.rateChart.find(r => r.activityName === activityType && r.status === 'active');
        if (rateItem) rate = rateItem.rate;
      }

      entriesToCreate.push({
        operatorId: staff._id,
        projectId: project._id,
        centerId: center._id,
        activityType: activityType || 'Scanning',
        scans: Number(unitsCompleted),
        amount: Number(unitsCompleted) * rate,
        date: new Date(workDate),
        status: 'entered', // Initial status
        auditTrail: [{
          action: 'Bulk Upload',
          by: req.user.id,
          details: `Uploaded by ${req.user.name}. Remarks: ${remarks || 'None'}`,
        }]
      });
    }

    if (entriesToCreate.length > 0) {
      await ScanEntry.insertMany(entriesToCreate);
    }

    res.status(201).json({ message: `Successfully created ${entriesToCreate.length} entries` });
  } catch (error) {
    console.error('Bulk create error:', error);
    res.status(500).json({ message: 'Server error during bulk creation' });
  }
};

// @desc    Get bulk upload history for current user
// @route   GET /api/scan-entry/bulk-history
// @access  Private
const getBulkUploadHistory = async (req, res) => {
  try {
    // Find entries where the first audit trail item (creation) was done by this user via 'Bulk Upload'
    // This is a bit complex query, alternatively we can just find entries created by this user recently
    // Or we can filter by auditTrail.0.by = user.id and auditTrail.0.action = 'Bulk Upload'

    const entries = await ScanEntry.find({
      'auditTrail.0.by': req.user.id,
      'auditTrail.0.action': 'Bulk Upload'
    })
      .sort({ createdAt: -1 })
      .limit(50) // Limit to last 50 entries
      .populate('projectId', 'name projectCode')
      .populate('centerId', 'name centerCode')
      .populate('operatorId', 'name employeeId');

    res.json(entries);
  } catch (error) {
    console.error('History fetch error:', error);
    res.status(500).json({ message: 'Server error fetching history' });
  }
};

module.exports = {
  createScanEntry,
  getMyEntries,
  rejectEntry,
  getPendingEntries,
  approveEntry,
  getStats,
  validateBulkUpload,
  bulkCreateScanEntries,
  getBulkUploadHistory
};
