const Project = require('../models/Project');

// @desc    Create a new project
// @route   POST /api/projects
// @access  Private (Admin)
const createProject = async (req, res) => {
  const { name, center, scanRate, productivityLimit } = req.body;

  try {
    const project = await Project.create({
      name,
      center,
      scanRate,
      productivityLimit,
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
    const projects = await Project.find({});
    res.json(projects);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  createProject,
  getProjects,
};
