const express = require('express');
const router = express.Router();

const { getActivities, createActivity } = require('../controllers/activityController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, getActivities)
  .post(protect, admin, createActivity);

module.exports = router;

