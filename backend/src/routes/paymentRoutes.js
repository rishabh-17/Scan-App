const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect, finance } = require('../middleware/authMiddleware');
const {
  importPayments,
  getPayments,
  getMyPayments,
  updatePaymentStatus,
  createPayment,
  markPaymentFailed,
  updateFailedPaymentStaff,
  resubmitFailedPayment
} = require('../controllers/paymentController');

// Multer setup for file upload (in memory)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.get('/my-payments', protect, getMyPayments);

router.route('/')
  .get(protect, getPayments)
  .post(protect, finance, createPayment);

router.put('/:id/fail', protect, markPaymentFailed);
router.put('/:id/failure-staff', protect, updateFailedPaymentStaff);
router.put('/:id/resubmit', protect, resubmitFailedPayment);

router.route('/:id')
  .put(protect, finance, updatePaymentStatus);

router.post('/import', protect, finance, upload.single('file'), importPayments);

module.exports = router;
