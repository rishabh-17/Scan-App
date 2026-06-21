const express = require('express');
const router = express.Router();
const { createProject, getProjects, getPublicProjects, updateProject, updateProjectRates, deleteProject } = require('../controllers/projectController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/')
  .post(protect, admin, createProject)
  .get(protect, getProjects);

router.get('/public', getPublicProjects);
router.put('/:id/rates', protect, updateProjectRates);

router.route('/:id')
  .put(protect, admin, updateProject)
  .delete(protect, admin, deleteProject);

module.exports = router;
