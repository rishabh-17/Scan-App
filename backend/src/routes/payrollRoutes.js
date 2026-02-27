const express = require('express');
const router = express.Router();
const { getPayroll } = require('../controllers/payrollController');
const { protect, admin } = require('../middleware/authMiddleware');

router.get('/', protect, admin, getPayroll);

module.exports = router;
