const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
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

const DEMO_ORGANIZATION = 'Hank Sample Workspace';
const DEMO_USERS = {
    admin: { email: 'demo-admin@hank.example', name: 'Hank Demo Admin', role: 'ADMIN' },
    guest: { email: 'demo-guest@hank.example', name: 'Hank Demo Guest', role: 'MEMBER' },
};
const SAMPLE_DOCUMENTS = [
    {
        name: 'Annual Leave Policy.txt',
        content: 'What is our leave policy? Our annual leave policy gives each full-time employee 20 days of paid annual leave per calendar year. Submit requests to your manager at least five working days in advance when possible. Up to five unused days may be carried into the next calendar year. Sick leave and public holidays are tracked separately.',
    },
    {
        name: 'Employee Onboarding Guide.txt',
        content: 'How does onboarding work? New employees complete onboarding during their first week. People Operations sends account setup instructions before the start date. On day one, the manager reviews team goals, security practices, and the 30-day plan. Required training should be completed within the first two weeks.',
    },
    {
        name: 'Expense Reimbursement Policy.txt',
        content: 'What expenses can I claim? Employees can claim reasonable business travel, approved customer meeting costs, and required work supplies. Add an itemized receipt and submit the expense report within 30 days. A manager must approve expenses before Finance processes reimbursement. Personal purchases and commuting costs are not reimbursable.',
    },
    {
        name: 'Security Incident Response.txt',
        content: 'If you suspect a security incident, report it to the security team immediately using the incident response channel. Include the affected system, the time observed, and any relevant error messages. Do not share credentials or attempt to investigate beyond preserving the evidence. The security lead will assess severity and coordinate updates.',
    },
];

function isDemoAccessEnabled() {
    if (process.env.ENABLE_DEMO_ACCESS === 'true') return true;
    return process.env.ENABLE_DEMO_ACCESS !== 'false'
        && process.env.NODE_ENV !== 'production'
        && process.env.NODE_ENV !== 'test';
}

let demoPasswordHash;

async function getDemoPasswordHash() {
    if (!demoPasswordHash) {
        demoPasswordHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 12);
    }
    return demoPasswordHash;
}

async function provisionDemoWorkspace() {
    const passwordHash = await getDemoPasswordHash();
    return prisma.$transaction(async (tx) => {
        let organization = await tx.organization.findFirst({ where: { name: DEMO_ORGANIZATION } });
        if (!organization) {
            organization = await tx.organization.create({ data: { name: DEMO_ORGANIZATION } });
        }

        const demoAccounts = {};
        for (const [key, definition] of Object.entries(DEMO_USERS)) {
            const user = await tx.user.upsert({
                where: { email: definition.email },
                update: { name: definition.name },
                create: { name: definition.name, email: definition.email, passwordHash },
            });
            const membership = await tx.organizationMember.upsert({
                where: { organizationId_userId: { organizationId: organization.id, userId: user.id } },
                update: { role: definition.role },
                create: { organizationId: organization.id, userId: user.id, role: definition.role },
            });
            demoAccounts[key] = { user, membership };
        }

        for (const sample of SAMPLE_DOCUMENTS) {
            let document = await tx.document.findFirst({
                where: { organizationId: organization.id, name: sample.name },
            });
            if (!document) {
                document = await tx.document.create({
                    data: {
                        organizationId: organization.id,
                        uploadedBy: demoAccounts.admin.user.id,
                        name: sample.name,
                        mimeType: 'text/plain',
                        storagePath: '',
                        status: 'READY',
                    },
                });
            }

            if (await tx.documentChunk.count({ where: { documentId: document.id } }) === 0) {
                await tx.documentChunk.create({
                    data: {
                        documentId: document.id,
                        chunkIndex: 0,
                        content: sample.content,
                        pageNumber: null,
                        metadata: {
                            documentId: document.id,
                            documentName: sample.name,
                            organizationId: organization.id,
                            chunkIndex: 0,
                            sample: true,
                        },
                    },
                });
            }
        }

        return { organization, demoAccounts };
    });
}

let demoProvisioning;

const demoStatus = (_req, res) => res.json({ enabled: isDemoAccessEnabled() });

const demoLogin = async (req, res, next) => {
    try {
        if (!isDemoAccessEnabled()) {
            return sendError(res, 'DEMO_ACCESS_DISABLED', 'Demo access is disabled', 404);
        }

        const parsed = z.object({ role: z.enum(['guest', 'admin']) }).safeParse(req.body);
        if (!parsed.success) {
            return sendError(res, 'INVALID_DEMO_ROLE', 'Choose guest or admin demo access', 400);
        }

        if (!demoProvisioning) {
            demoProvisioning = provisionDemoWorkspace();
        }
        let workspace;
        try {
            workspace = await demoProvisioning;
        } finally {
            demoProvisioning = null;
        }

        const { user, membership } = workspace.demoAccounts[parsed.data.role];
        const token = jwt.sign(
            { userId: user.id, organizationId: workspace.organization.id, demoRole: parsed.data.role },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        return res.json({
            token,
            user: { id: user.id, name: user.name, email: user.email },
            organization: { id: workspace.organization.id, name: workspace.organization.name },
            role: membership.role,
            demo: true,
        });
    } catch (err) {
        return next(err);
    }
};

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

module.exports = { register, login, me, demoStatus, demoLogin };
