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

const verifyEntry = (req, res) => approveEntry(req, res, 'supervisor');
const centerApprove = (req, res) => approveEntry(req, res, 'center');
const projectApprove = (req, res) => approveEntry(req, res, 'project');
const financeApprove = (req, res) => approveEntry(req, res, 'finance');

// Get entries (pending or approved)
const getPendingEntries = async (req, res) => {
  try {
    const { type } = req.query;
    let query = {};

    if (type === 'approved') {
      // Show entries that have been approved by this role
      // Dynamic: infer approval field from role (e.g. center_manager -> center)
      if (req.user.role === 'admin') {
        const finalStates = Object.entries(workflowConfig.states)
          .filter(([_, def]) => def.type === 'final')
          .map(([name, _]) => name);
        query.status = { $in: finalStates }; // Admin sees completed entries
      } else {
        const approvalField = req.user.role.replace('_manager', '');
        // Query the map field using dot notation
        query[`approvals.${approvalField}.approved`] = true;
      }
    } else {
      // Pending approvals
      query = { status: { $ne: 'locked' } };

      if (req.user.role === 'admin') {
        const finalStates = Object.entries(workflowConfig.states)
          .filter(([_, def]) => def.type === 'final')
          .map(([name, _]) => name);
        query.status = { $nin: finalStates };
      } else {
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
      if (snapshot.can({ type: 'APPROVE' })) actions.push('APPROVE');
      if (snapshot.can({ type: 'REJECT' })) actions.push('REJECT');

      return { ...entry, actions };
    });

    res.json(entriesWithActions);
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
  rejectEntry,
  getPendingEntries,
  approveEntry
};
