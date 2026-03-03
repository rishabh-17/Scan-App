const express = require('express');
const router = express.Router();
const {
    createScanEntry,
    getMyEntries,
    verifyEntry,
    centerApprove,
    projectApprove,
    financeApprove,
    rejectEntry,
    getPendingEntries,
    approveEntry
} = require('../controllers/scanEntryController');
const { protect, admin } = require('../middleware/authMiddleware');

router.post('/', protect, createScanEntry);
router.get('/my-entries', protect, getMyEntries);

// Approval Routes
// Dynamic/Generic approval route
router.put('/:id/approve', protect, approveEntry);

// Legacy routes for backward compatibility
router.put('/:id/verify', protect, verifyEntry);
router.put('/:id/approve-center', protect, centerApprove);
router.put('/:id/approve-project', protect, projectApprove);
router.put('/:id/approve-finance', protect, financeApprove);
router.put('/:id/reject', protect, rejectEntry);

// Admin Dashboard routes
router.get('/pending', protect, getPendingEntries);

module.exports = router;
