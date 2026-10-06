const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const prisma = require('../lib/prisma');
const { sendError } = require('../utils/errors');

const registerSchema = z.object({
    name: z.string().trim().min(1),
    email: z.string().trim().toLowerCase().email(),
    password: z.string().min(6),
    organizationName: z.preprocess(
        (value) => typeof value === 'string' && value.trim() === '' ? undefined : value,
        z.string().trim().min(1).optional(),
    ),
});

const loginSchema = z.object({
    email: z.string().trim().toLowerCase().email(),
    password: z.string().min(1),
});

const register = async (req, res, next) => {
    try {
        const { name, email, password, organizationName } = registerSchema.parse(req.body);

        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            return sendError(res, 'EMAIL_IN_USE', 'Email is already registered', 409);
        }

        const passwordHash = await bcrypt.hash(password, 12);
        const { user, organization } = await prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: { name, email, passwordHash },
            });
            const organization = await tx.organization.create({
                data: {
                    name: organizationName || `${name}'s Organization`,
                    members: {
                        create: { userId: user.id, role: 'ADMIN' },
                    },
                },
            });
            return { user, organization };
        });

        const token = jwt.sign(
            { userId: user.id, organizationId: organization.id },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        return res.status(201).json({
            token,
            user: { id: user.id, name: user.name, email: user.email },
            organization: { id: organization.id, name: organization.name },
        });
    } catch (err) {
        next(err);
    }
};

const login = async (req, res, next) => {
    try {
        const { email, password } = loginSchema.parse(req.body);

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return sendError(res, 'INVALID_CREDENTIALS', 'Invalid email or password', 401);
        }

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
            return sendError(res, 'INVALID_CREDENTIALS', 'Invalid email or password', 401);
        }

        // Get user's organizations
        const memberships = await prisma.organizationMember.findMany({
            where: { userId: user.id },
            include: { organization: true },
        });

        if (memberships.length === 0) {
            return sendError(res, 'NO_ORGANIZATION', 'User has no organization memberships', 403);
        }

        const primaryOrg = memberships[0].organization;

        const token = jwt.sign(
            { userId: user.id, organizationId: primaryOrg.id },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        return res.json({
            token,
            user: { id: user.id, name: user.name, email: user.email },
            organization: { id: primaryOrg.id, name: primaryOrg.name },
            organizations: memberships.map((m) => ({
                id: m.organization.id,
                name: m.organization.name,
                role: m.role,
            })),
        });
    } catch (err) {
        next(err);
    }
};

const me = async (req, res) => {
    return res.json({
        user: { id: req.user.id, name: req.user.name, email: req.user.email },
        organizationId: req.organizationId,
        role: req.membership.role,
    });
};

module.exports = { register, login, me };
