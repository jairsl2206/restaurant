require('dotenv').config();
const createApp = require('./app');
const path = require('path');
const express = require('express');
const cors = require('cors');
const multer = require('multer');

const PORT = process.env.PORT || 3001;
const whatsappService = require('../../../whatsappService');
const logger = require('../../../logger');

// Create app with Clean Architecture
const app = createApp();
logger.info('--- CA SERVER BOOTING ---');


// Initialize WhatsApp (Safe version with retry logic)
whatsappService.initializeClient();

// Additional middleware for legacy compatibility
app.use(cors());

// File Upload (legacy - should be moved to infrastructure layer eventually)
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '../../../uploads'))
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname).toLowerCase() || '.png';
        const safeExt = ['.png', '.jpg', '.jpeg', '.webp'].includes(ext) ? ext : '.png';
        cb(null, 'upload-' + uniqueSuffix + safeExt)
    }
});
const upload = multer({ storage: storage });

app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ url: fileUrl });
});

// Static uploads
app.use('/uploads', express.static(path.join(__dirname, '../../../uploads')));

// Serve static files from React build (PRODUCTION)
const distPath = path.join(__dirname, '../../../../client/dist');
logger.info(`📁 Serving static files from: ${distPath}`);
app.use(express.static(distPath, {
    index: 'index.html',
    extensions: ['html']
}));

// Fallback to index.html for client-side routing (SPA)
app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
        return next();
    }
    const indexPath = path.join(distPath, 'index.html');
    res.sendFile(indexPath);
});

// ── Process error handling ───────────────────────────────────────────────────
process.on('uncaughtException', (err) => {
    logger.error('CRITICAL: Uncaught Exception:', { message: err.message, stack: err.stack });
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('CRITICAL: Unhandled Rejection at:', { promise, reason });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    logger.info('🚀 Restaurant POS Server (Clean Architecture) started');
    logger.info(`🚀 Server running on http://localhost:${PORT}`);
    logger.info(`📊 API available at http://localhost:${PORT}/api`);
    logger.info(`🌐 Frontend available at http://localhost:${PORT}`);
});

module.exports = app;
