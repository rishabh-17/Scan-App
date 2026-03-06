const Project = require('../models/Project');

// @desc    Create a new project
// @route   POST /api/projects
// @access  Private (Admin)
const createProject = async (req, res) => {
  const { name, clientName, projectCode, startDate, endDate, centers, scanRate, productivityLimit, managers, rateChart } = req.body;

  try {
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
      rateChart,
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

    // RBAC: Project Managers only see their assigned projects
    if (req.user && req.user.role === 'project_manager') {
      if (req.user.project) {
        // New way: Assigned via User.project
        query._id = req.user.project;
      } else {
        // Legacy way: Assigned via Project.managers
        query.managers = req.user._id;
      }
    }

    const projects = await Project.find(query)
      .populate('managers', 'name mobile')
      .populate('centers', 'name centerCode');
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
        project.rateChart = req.body.rateChart;
      }

      // Toggle active status if provided
      if (typeof req.body.isActive !== 'undefined') {
        project.isActive = req.body.isActive;
      }

      const updatedProject = await project.save();
      const populatedProject = await Project.findById(updatedProject._id)
        .populate('managers', 'name mobile')
        .populate('centers', 'name centerCode');
      res.json(populatedProject);
    } else {
      res.status(404).json({ message: 'Project not found' });
    }
  } catch (error) {
    res.status(400).json({ message: 'Invalid project data' });
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
  updateProject,
  deleteProject,
};
