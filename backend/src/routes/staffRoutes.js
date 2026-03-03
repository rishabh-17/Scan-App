const express = require('express');
const router = express.Router();
const { getAllStaff, getStaffById, updateStaff, deleteStaff } = require('../controllers/staffController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/').get(protect, admin, getAllStaff);
router.route('/:id')
  .get(protect, admin, getStaffById)
  .put(protect, admin, updateStaff)
  .delete(protect, admin, deleteStaff);

module.exports = router;
