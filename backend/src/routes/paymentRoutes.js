const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect, admin, finance } = require('../middleware/authMiddleware');
const { importPayments, getPayments } = require('../controllers/paymentController');

// Multer setup for file upload (in memory)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.route('/')
  .get(protect, finance, getPayments);

router.post('/import', protect, finance, upload.single('file'), importPayments);

module.exports = router;
