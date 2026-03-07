const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect, admin, finance } = require('../middleware/authMiddleware');
const { importPayments, getPayments, getMyPayments, updatePaymentStatus, createPayment } = require('../controllers/paymentController');

// Multer setup for file upload (in memory)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.get('/my-payments', protect, getMyPayments);

router.route('/')
  .get(protect, finance, getPayments)
  .post(protect, finance, createPayment);

router.route('/:id')
  .put(protect, finance, updatePaymentStatus);

router.post('/import', protect, finance, upload.single('file'), importPayments);

module.exports = router;
