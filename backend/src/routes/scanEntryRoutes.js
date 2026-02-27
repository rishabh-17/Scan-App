const express = require('express');
const router = express.Router();
const {
    createScanEntry,
    getMyEntries,
    verifyEntry,
    centerApprove,
    projectApprove,
    financeApprove,
    getPendingEntries
} = require('../controllers/scanEntryController');
const { protect, admin } = require('../middleware/authMiddleware');

router.post('/', protect, createScanEntry);
router.get('/my-entries', protect, getMyEntries);

// Approval routes
router.put('/:id/verify', protect, verifyEntry);
router.put('/:id/approve-center', protect, centerApprove);
router.put('/:id/approve-project', protect, projectApprove);
router.put('/:id/approve-finance', protect, financeApprove);

// Admin Dashboard routes
router.get('/pending', protect, getPendingEntries);

module.exports = router;
