const express = require('express');
const router = express.Router();
const { getAllStaff, updateStaff, deleteStaff } = require('../controllers/staffController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/').get(protect, admin, getAllStaff);
router.route('/:id')
  .put(protect, admin, updateStaff)
  .delete(protect, admin, deleteStaff);

module.exports = router;
