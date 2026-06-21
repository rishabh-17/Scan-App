const Project = require('../models/Project');
const Center = require('../models/Center');
const { normalizeRateChart } = require('../utils/activityCatalog');

const canManageProjectRates = async (project, user) => {
  if (!user) return false;
  if (user.role === 'admin' || user.role === 'finance_hr') return true;
  if (user.role !== 'project_manager') return false;
  if (user.project && String(user.project) === String(project._id)) return true;
  return Array.isArray(project.managers) && project.managers.some((managerId) => String(managerId) === String(user._id));
};

const getPublicProjects = async (req, res) => {
  try {
    const { center } = req.query;

    const query = { isActive: { $ne: false } };
    if (center && /^[0-9a-fA-F]{24}$/.test(String(center))) {
      query.centers = center;
    }

    const projects = await Project.find(query).select('name projectCode centers _id');
    res.json(projects);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Create a new project
// @route   POST /api/projects
// @access  Private (Admin)
const createProject = async (req, res) => {
  const { name, clientName, projectCode, startDate, endDate, centers, scanRate, productivityLimit, managers, rateChart } = req.body;

  try {
    const { invalid, normalized } = await normalizeRateChart(rateChart);
    if (invalid.length > 0) {
      return res.status(400).json({ message: `Invalid activity in rate chart: ${invalid.filter(Boolean).join(', ') || '-'}` });
    }

    const project = await Project.create({
      name,
      clientName,
      projectCode,
      startDate,
      endDate,
      centers,
      scanRate,
      productivityLimit,
      managers,
      rateChart: normalized,
    });
    res.status(201).json(project);
  } catch (error) {
    res.status(400).json({ message: 'Invalid project data' });
  }
};

// @desc    Get all projects
// @route   GET /api/projects
// @access  Private
const getProjects = async (req, res) => {
  try {
    let query = {};

    // RBAC: Center Supervisors only see projects for their assigned centers
    if (req.user && req.user.role === 'center_supervisor') {
      let centerIds = [];
      if (req.user.center) {
        centerIds = [req.user.center];
      } else {
        const centers = await Center.find({ supervisors: req.user._id }).select('_id').lean();
        centerIds = centers.map(c => c._id);
      }

      if (centerIds.length === 0) {
        return res.json([]);
      }

      query.centers = { $in: centerIds };
    }

    const projects = await Project.find(query)
      .populate('managers', 'name mobile')
      .populate('centers', 'name centerCode location')
      .populate('rateChart.center', 'name centerCode location');
    res.json(projects);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update project
// @route   PUT /api/projects/:id
// @access  Private (Admin)
const updateProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (project) {
      project.name = req.body.name || project.name;
      project.clientName = req.body.clientName || project.clientName;
      project.projectCode = req.body.projectCode || project.projectCode;
      project.startDate = req.body.startDate || project.startDate;
      project.endDate = req.body.endDate || project.endDate;
      if (req.body.centers) {
        project.centers = req.body.centers;
      }
      project.scanRate = req.body.scanRate || project.scanRate;
      project.productivityLimit = req.body.productivityLimit || project.productivityLimit;
      if (req.body.managers) {
        project.managers = req.body.managers;
      }
      if (req.body.rateChart) {
        const { invalid, normalized } = await normalizeRateChart(req.body.rateChart);
        if (invalid.length > 0) {
          return res.status(400).json({ message: `Invalid activity in rate chart: ${invalid.filter(Boolean).join(', ') || '-'}` });
        }
        project.rateChart = normalized;
      }

      // Toggle active status if provided
      if (typeof req.body.isActive !== 'undefined') {
        project.isActive = req.body.isActive;
      }

      const updatedProject = await project.save();
      const populatedProject = await Project.findById(updatedProject._id)
        .populate('managers', 'name mobile')
        .populate('centers', 'name centerCode location')
        .populate('rateChart.center', 'name centerCode location');
      res.json(populatedProject);
    } else {
      res.status(404).json({ message: 'Project not found' });
    }
  } catch (error) {
    res.status(400).json({ message: 'Invalid project data' });
  }
};

const updateProjectRates = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const allowed = await canManageProjectRates(project, req.user);
    if (!allowed) {
      return res.status(403).json({ message: 'Not authorized to manage project rates' });
    }

    const { invalid, normalized } = await normalizeRateChart(req.body.rateChart);
    if (invalid.length > 0) {
      return res.status(400).json({ message: `Invalid activity in rate chart: ${invalid.filter(Boolean).join(', ') || '-'}` });
    }

    if (typeof req.body.scanRate !== 'undefined') {
      project.scanRate = req.body.scanRate;
    }
    project.rateChart = normalized;

    const updatedProject = await project.save();
    const populatedProject = await Project.findById(updatedProject._id)
      .populate('managers', 'name mobile')
      .populate('centers', 'name centerCode location')
      .populate('rateChart.center', 'name centerCode location');
    res.json(populatedProject);
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: 'Invalid project rate data' });
  }
};

// @desc    Delete project
// @route   DELETE /api/projects/:id
// @access  Private (Admin)
const deleteProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (project) {
      await project.deleteOne();
      res.json({ message: 'Project removed' });
    } else {
      res.status(404).json({ message: 'Project not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  createProject,
  getProjects,
  getPublicProjects,
  updateProject,
  updateProjectRates,
  deleteProject,
};
