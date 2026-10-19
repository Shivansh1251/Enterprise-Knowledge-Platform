require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');

const authRoutes = require('./routes/auth');
const documentRoutes = require('./routes/documents');
const searchRoutes = require('./routes/search');
const chatRoutes = require('./routes/chat');
const { errorHandler } = require('./middleware/errorHandler');
const prisma = require('./lib/prisma');

const app = express();

if (process.env.NODE_ENV === 'production'
    && (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32 || /replace-with/i.test(process.env.JWT_SECRET))) {
    throw new Error('Production requires a private JWT_SECRET with at least 32 characters.');
}

const allowedOrigins = (process.env.CLIENT_ORIGINS
    || 'http://localhost:5173,http://127.0.0.1:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

// ── Security & logging ────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
        return callback(new Error('Origin is not allowed by CORS'));
    },
    credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json());

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.get('/ready', async (req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        const tables = await prisma.$queryRaw`
            SELECT
                to_regclass('public.users') IS NOT NULL AS users,
                to_regclass('public.organizations') IS NOT NULL AS organizations,
                to_regclass('public.organization_members') IS NOT NULL AS organization_members,
                to_regclass('public.documents') IS NOT NULL AS documents,
                to_regclass('public.document_chunks') IS NOT NULL AS document_chunks
        `;
        if (Object.values(tables[0]).some((exists) => !exists)) {
            return res.status(503).json({ status: 'not_ready', database: 'ok', schema: 'unavailable' });
        }
        return res.json({ status: 'ready', database: 'ok', schema: 'ok' });
    } catch {
        return res.status(503).json({ status: 'not_ready', database: 'unavailable' });
    }
});

// ── API routes ────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/chat', chatRoutes);

const clientDistPath = path.resolve(__dirname, '../../client/dist');
if (process.env.NODE_ENV === 'production' && fs.existsSync(clientDistPath)) {
    app.use(express.static(clientDistPath, { index: false, maxAge: '1y', immutable: true }));
    app.get(/^(?!\/api(?:\/|$)|\/health$).*/, (req, res, next) => {
        if (req.method !== 'GET') return next();
        res.setHeader('Cache-Control', 'no-cache');
        return res.sendFile(path.join(clientDistPath, 'index.html'), (err) => {
            if (err) next(err);
        });
    });
}

// ── Global error handler ──────────────────────────────────────────────────────
app.use(errorHandler);

// ── Start server ──────────────────────────────────────────────────────────────
const PORT = Number(process.env.PORT) || 5000;
const HOST = process.env.HOST || (process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1');
app.listen(PORT, HOST, () => {
    console.log(`🚀 Server running on http://${HOST}:${PORT}`);
});
