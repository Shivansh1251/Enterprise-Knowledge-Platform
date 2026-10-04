/**
 * Standard error response shape as per API.md
 */
class AppError extends Error {
    constructor(code, message, statusCode = 400) {
        super(message);
        this.code = code;
        this.statusCode = statusCode;
    }
}

const sendError = (res, code, message, statusCode = 400) => {
    return res.status(statusCode).json({ error: { code, message } });
};

module.exports = { AppError, sendError };
