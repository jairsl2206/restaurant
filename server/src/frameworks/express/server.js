require('dotenv').config();
const createApp = require('./app');
const path = require('path');
const express = require('express');
const cors = require('cors');
const multer = require('multer');

const PORT = process.env.PORT || 3001;

// Create app with Clean Architecture
const app = createApp();

// Additional middleware for legacy compatibility
app.use(cors());

// File Upload (legacy - should be moved to infrastructure layer eventually)
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '../../../uploads'))
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname) || '.png';
        cb(null, 'logo-' + uniqueSuffix + ext)
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

// Debug logging
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// Serve static files from React build (PRODUCTION)
const distPath = path.join(__dirname, '../../../../client/dist');
console.log(`📁 Serving static files from: ${distPath}`);
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

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 API available at http://localhost:${PORT}/api`);
    console.log(`🏗️  Clean Architecture API at http://localhost:${PORT}/api/v2`);
    console.log(`🌐 Frontend available at http://localhost:${PORT}`);
    console.log(`🌍 Network access: http://192.168.1.81:${PORT}`);
});

module.exports = app;
