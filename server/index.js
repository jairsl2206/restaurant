require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const logger = require('./logger');
const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || 3001;
const whatsappService = require('./whatsappService');

// Initialize WhatsApp
whatsappService.initializeClient();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// HTTP Request Logging
app.use(morgan(':method :url :status :res[content-length] - :response-time ms', {
    stream: { write: (message) => logger.info(message.trim()) }
}));

// Routes
app.use('/api', (req, res, next) => {
    req.whatsapp = whatsappService;
    next();
}, routes);

// Static uploads
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// File Upload with Multer
const multer = require('multer');
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Use absolute path to ensure consistency regardless of CWD
        cb(null, path.join(__dirname, 'uploads'))
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
    // Use relative URL so it works on any device (localhost, network IP, or domain)
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ url: fileUrl });
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'Server is running' });
});

// Serve static files from React build (PRODUCTION)
// This must come AFTER all API routes
const distPath = path.join(__dirname, '../client/dist');
console.log(`📁 Serving static files from: ${distPath}`);
app.use(express.static(distPath, {
    index: 'index.html',
    extensions: ['html']
}));

// Fallback to index.html for client-side routing (SPA)
app.use((req, res, next) => {
    // Don't handle API routes
    if (req.path.startsWith('/api')) {
        return next();
    }
    const indexPath = path.join(__dirname, '../client/dist/index.html');
    logger.info(`📄 Serving index.html from: ${indexPath}`);
    res.sendFile(indexPath);
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    logger.info(`🚀 Server running on http://localhost:${PORT}`);
    logger.info(`📊 API available at http://localhost:${PORT}/api`);
    logger.info(`🌐 Frontend available at http://localhost:${PORT}`);
});

module.exports = app;
