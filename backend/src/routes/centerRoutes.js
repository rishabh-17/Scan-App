const express = require('express');
const router = express.Router();
const { createCenter, getCenters, updateCenter, deleteCenter, getPublicCenters } = require('../controllers/centerController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/')
  .post(protect, admin, createCenter)
  .get(protect, getCenters);

router.get('/public', getPublicCenters);

router.route('/:id')
  .put(protect, admin, updateCenter)
  .delete(protect, admin, deleteCenter);

module.exports = router;
