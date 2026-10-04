require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const authRoutes = require('./routes/auth');
const documentRoutes = require('./routes/documents');
const searchRoutes = require('./routes/search');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();

// ── Security & logging ────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(morgan('dev'));
app.use(express.json());

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// ── API routes ────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/search', searchRoutes);

// ── Global error handler ──────────────────────────────────────────────────────
app.use(errorHandler);

// ── Start server ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
