const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { upload, list, getOne, remove } = require('../controllers/documentController');
const { authenticate } = require('../middleware/auth');
const { AppError, sendError } = require('../utils/errors');

const router = express.Router();

// Storage: save files outside public web root
const uploadDir = path.resolve(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const allowedExtensions = new Map([
    ['.pdf', 'application/pdf'],
    ['.txt', 'text/plain'],
]);

function getDisplayName(originalName) {
    return path.posix.basename(String(originalName || '').replace(/\\/g, '/'))
        .replace(/[\x00-\x1f\x7f]/g, '')
        .trim()
        .slice(0, 255);
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const displayName = getDisplayName(file.originalname);
        const extension = path.extname(displayName).toLowerCase();
        cb(null, `${crypto.randomUUID()}${extension}`);
    },
});

const fileFilter = (req, file, cb) => {
    const displayName = getDisplayName(file.originalname);
    const extension = path.extname(displayName).toLowerCase();
    const expectedMimeType = allowedExtensions.get(extension);

    if (!displayName || !expectedMimeType || file.mimetype !== expectedMimeType) {
        return cb(new AppError(
            'UNSUPPORTED_FILE_TYPE',
            'Upload a PDF or TXT file with a matching file extension.',
            415,
        ));
    }

    file.displayName = displayName;
    return cb(null, true);
};

const uploadMiddleware = multer({
    storage,
    fileFilter,
    limits: { fileSize: 25 * 1024 * 1024, files: 1 }, // 25 MB, one file per request
});

router.use(authenticate);

const requireDemoAdminForWrites = (req, res, next) => {
    if (req.demoRole === 'guest') {
        return sendError(res, 'DEMO_GUEST_READ_ONLY', 'Guest demo access is read-only', 403);
    }
    return next();
};

router.post('/', requireDemoAdminForWrites, uploadMiddleware.single('file'), upload);
router.get('/', list);
router.get('/:id', getOne);
router.delete('/:id', requireDemoAdminForWrites, remove);

module.exports = router;
