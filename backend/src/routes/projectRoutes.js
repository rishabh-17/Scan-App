const express = require('express');
const router = express.Router();
const { createProject, getProjects } = require('../controllers/projectController');
const { protect, admin } = require('../middleware/authMiddleware');

router.post('/', protect, admin, createProject);
router.get('/', protect, getProjects);

module.exports = router;
