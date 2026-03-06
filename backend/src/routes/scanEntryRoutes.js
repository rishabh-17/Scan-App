const express = require('express');
const router = express.Router();
const {
    createScanEntry,
    getMyEntries,
    rejectEntry,
    getPendingEntries,
    approveEntry,
    getStats,
    validateBulkUpload,
    bulkCreateScanEntries,
    getBulkUploadHistory
} = require('../controllers/scanEntryController');
const { protect, admin } = require('../middleware/authMiddleware');

router.get('/stats', protect, getStats);
router.post('/', protect, createScanEntry);
router.post('/bulk-validate', protect, validateBulkUpload);
router.post('/bulk-create', protect, bulkCreateScanEntries);
router.get('/bulk-history', protect, getBulkUploadHistory);
router.get('/my-entries', protect, getMyEntries);

// Approval Routes
// Generic approval route
router.put('/:id/approve', protect, approveEntry);
router.put('/:id/reject', protect, rejectEntry);

// Admin Dashboard routes
router.get('/pending', protect, getPendingEntries);

module.exports = router;
