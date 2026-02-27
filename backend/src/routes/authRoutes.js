const express = require('express');
const router = express.Router();
const { registerStaff, loginStaff, getMe, updateProfile } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', registerStaff);
router.post('/login', loginStaff);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);

module.exports = router;
