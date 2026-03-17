const multer = require('multer');
const path = require('path');

const storage = multer.memoryStorage();

const allowedExt = new Set(['.csv', '.xlsx', '.xls']);

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname || '').toLowerCase();
  if (allowedExt.has(ext)) {
    cb(null, true);
    return;
  }
  cb(new Error('Only CSV/XLSX/XLS files are allowed'));
};

const importUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 15 * 1024 * 1024,
  },
});

module.exports = importUpload;

