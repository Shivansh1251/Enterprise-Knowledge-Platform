const { sendError } = require('../utils/errors');

/**
 * Global error handler — catches unhandled errors from async routes.
 */
const errorHandler = (err, req, res, next) => {
    if (res.headersSent) return next(err);
    console.error(err);

    if (err.code && err.statusCode) {
        return sendError(res, err.code, err.message, err.statusCode);
    }

    if (err.code === 'LIMIT_FILE_SIZE') {
        return sendError(res, 'FILE_TOO_LARGE', 'Files must be 25 MB or smaller', 413);
    }

    if (err.name === 'MulterError') {
        return sendError(res, 'INVALID_UPLOAD', 'Upload one supported file per request', 400);
    }

    if (err.type === 'entity.parse.failed') {
        return sendError(res, 'INVALID_JSON', 'Request body must contain valid JSON', 400);
    }

    // Zod validation errors
    if (err.name === 'ZodError') {
        const firstIssue = err.issues?.[0] ?? err.errors?.[0];
        return sendError(res, 'VALIDATION_ERROR', firstIssue?.message || 'Invalid request', 400);
    }

    if (err.code === 'P2002') {
        return sendError(res, 'CONFLICT', 'A record with this value already exists', 409);
    }

    const databaseUnavailable = new Set(['P1000', 'P1001', 'P1002', 'P1003', 'P1008', 'P1017', 'ECONNREFUSED', 'EACCES']);
    if (databaseUnavailable.has(err.code)) {
        return sendError(res, 'DATABASE_UNAVAILABLE', 'The database is unavailable. Start PostgreSQL, then try again.', 503);
    }

    return sendError(res, 'INTERNAL_ERROR', 'An unexpected error occurred', 500);
};

module.exports = { errorHandler };
