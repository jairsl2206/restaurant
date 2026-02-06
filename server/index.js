const express = require('express');
const cors = require('cors');
const routes = require('./routes');
process.env.TZ = 'America/Mexico_City';

const app = express();
const PORT = process.env.PORT || 3001;
const whatsappService = require('./whatsappService');

// Initialize WhatsApp
whatsappService.initializeClient();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
        // Ensure we handle the extension safely
        const ext = path.extname(file.originalname) || '.png';
        cb(null, 'logo-' + uniqueSuffix + ext)
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

// Debug logging
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
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
    console.log(`📄 Serving index.html from: ${indexPath}`);
    res.sendFile(indexPath);
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 API available at http://localhost:${PORT}/api`);
    console.log(`🌐 Frontend available at http://localhost:${PORT}`);
    console.log("Timezone: ", Intl.DateTimeFormat().resolvedOptions().timeZone);
    console.log("Date: ", new Date().toISOString());
});

module.exports = app;
