const Center = require('../models/Center');
const Staff = require('../models/Staff');

// @desc    Create a new center
// @route   POST /api/centers
// @access  Private (Admin)
const createCenter = async (req, res) => {
  const { name, centerCode, location, contactEmail, contactPhone, supervisors } = req.body;

  try {
    const center = await Center.create({
      name,
      centerCode,
      location,
      contactEmail,
      contactPhone,
      supervisors,
    });

    const populatedCenter = await Center.findById(center._id).populate('supervisors', 'name mobile');
    res.status(201).json(populatedCenter);
  } catch (error) {
    res.status(400).json({ message: 'Invalid center data' });
  }
};

// @desc    Get all centers
// @route   GET /api/centers
// @access  Private
const getCenters = async (req, res) => {
  try {
    let query = {};

    // RBAC: Center Supervisors only see their assigned centers
    if (req.user && req.user.role === 'center_supervisor') {
      query.supervisors = req.user._id;
    }

    const centers = await Center.find(query).populate('supervisors', 'name mobile email');
    res.json(centers);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update center
// @route   PUT /api/centers/:id
// @access  Private (Admin)
const updateCenter = async (req, res) => {
  try {
    const center = await Center.findById(req.params.id);

    if (center) {
      center.name = req.body.name || center.name;
      center.centerCode = req.body.centerCode || center.centerCode;
      center.location = req.body.location || center.location;
      center.contactEmail = req.body.contactEmail || center.contactEmail;
      center.contactPhone = req.body.contactPhone || center.contactPhone;

      if (req.body.supervisors) {
        center.supervisors = req.body.supervisors;
      }

      // Toggle active status if provided
      if (typeof req.body.status !== 'undefined') {
        center.status = req.body.status;
      }

      const updatedCenter = await center.save();
      const populatedCenter = await Center.findById(updatedCenter._id).populate('supervisors', 'name mobile email');
      res.json(populatedCenter);
    } else {
      res.status(404).json({ message: 'Center not found' });
    }
  } catch (error) {
    res.status(400).json({ message: 'Invalid center data' });
  }
};

// @desc    Delete center
// @route   DELETE /api/centers/:id
// @access  Private (Admin)
const deleteCenter = async (req, res) => {
  try {
    const center = await Center.findById(req.params.id);

    if (center) {
      await center.deleteOne();
      res.json({ message: 'Center removed' });
    } else {
      res.status(404).json({ message: 'Center not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  createCenter,
  getCenters,
  updateCenter,
  deleteCenter,
};
