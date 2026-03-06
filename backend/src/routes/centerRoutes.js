const express = require('express');
const router = express.Router();
const { createCenter, getCenters, updateCenter, deleteCenter } = require('../controllers/centerController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/')
  .post(protect, admin, createCenter)
  .get(protect, getCenters);

router.route('/:id')
  .put(protect, admin, updateCenter)
  .delete(protect, admin, deleteCenter);

module.exports = router;
