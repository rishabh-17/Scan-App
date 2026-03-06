const express = require('express');
const router = express.Router();
const { getAllStaff, getStaffById, updateStaff, deleteStaff, createStaff } = require('../controllers/staffController');
const { protect, admin, finance, staffManager, staffViewer } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

const cpUpload = upload.fields([
  { name: 'aadhaarDoc', maxCount: 1 },
  { name: 'panDoc', maxCount: 1 },
  { name: 'cancelledChequeDoc', maxCount: 1 }
]);

router.route('/')
  .get(protect, staffViewer, getAllStaff)
  .post(protect, staffManager, cpUpload, createStaff);
router.route('/:id')
  .get(protect, staffViewer, getStaffById)
  .put(protect, staffManager, cpUpload, updateStaff)
  .delete(protect, admin, deleteStaff);

module.exports = router;
