require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const container = require('../di/container');
const setupRoutes = require('./routes');
const createAuthMiddleware = require('../../interface-adapters/middleware/AuthMiddleware');
const createErrorHandler = require('../../interface-adapters/middleware/errorHandler');


/**
 * Create and configure Express app with full Clean Architecture
 * @param {Object} [providedContainer] - Optional DI container for testing
 */
function createApp(providedContainer = null) {
    const app = express();
    const activeContainer = providedContainer || container;
    const logger = activeContainer.resolve('logger');
    const jwtSecret = activeContainer.resolve('jwtSecret');
    const auth = createAuthMiddleware(jwtSecret);

    // ── Core Middleware ──────────────────────────────────────────────────────
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // HTTP request logging via Morgan + Winston
    app.use(morgan('combined', {
        stream: { write: (msg) => logger.info(msg.trim()) }
    }));

    // ── Health Check ──────────────────────────────────────────────────────────
    app.get('/health', (req, res) => {
        res.json({ status: 'OK', architecture: 'Clean Architecture', version: '2.0' });
    });

    // ── Clean Architecture Routes ─────────────────────────────────────────────
    setupRoutes(app, activeContainer, auth);

    // ── Error Handler (must be last) ──────────────────────────────────────────
    app.use(createErrorHandler(logger));

    return app;
}

module.exports = createApp;
