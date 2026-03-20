const express = require('express');
const router = express.Router();
const { getPayroll, importPayroll } = require('../controllers/payrollController');
const { protect, finance } = require('../middleware/authMiddleware');
const importUpload = require('../middleware/importUploadMiddleware');

router.get('/', protect, finance, getPayroll);
router.post('/import', protect, finance, importUpload.single('file'), importPayroll);

module.exports = router;
