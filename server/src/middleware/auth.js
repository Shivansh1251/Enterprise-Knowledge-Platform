const jwt = require('jsonwebtoken');
const { sendError } = require('../utils/errors');
const prisma = require('../lib/prisma');

/**
 * Verifies JWT, fetches user + active org membership, attaches to req.
 * Header: Authorization: Bearer <token>
 * Token payload: { userId, organizationId }
 */
const authenticate = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return sendError(res, 'UNAUTHORIZED', 'Authentication required', 401);
    }

    const token = authHeader.split(' ')[1];
    let payload;
    try {
        payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
        return sendError(res, 'INVALID_TOKEN', 'Token is invalid or expired', 401);
    }

    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) {
        return sendError(res, 'USER_NOT_FOUND', 'User not found', 401);
    }

    // Verify org membership
    const membership = await prisma.organizationMember.findUnique({
        where: {
            organizationId_userId: {
                organizationId: payload.organizationId,
                userId: user.id,
            },
        },
    });

    if (!membership) {
        return sendError(res, 'FORBIDDEN', 'Not a member of this organization', 403);
    }

    req.user = user;
    req.organizationId = payload.organizationId;
    req.membership = membership;
    req.demoRole = payload.demoRole || null;
    next();
};

module.exports = { authenticate };
