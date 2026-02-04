const express = require('express');
const container = require('../di/container');
const createOrderRoutes = require('./routes/orderRoutes');
const errorHandler = require('../../interface-adapters/middleware/errorHandler');

// Legacy routes (will be migrated gradually)
const legacyRoutes = require('../../../routes');

/**
 * Create and configure Express app with Clean Architecture
 */
function createApp() {
    const app = express();

    // Middleware
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Health check
    app.get('/health', (req, res) => {
        res.json({ status: 'OK', message: 'Server is running', architecture: 'Clean Architecture' });
    });

    // Clean Architecture Routes (New)
    const orderController = container.resolve('orderController');
    app.use('/api/v2/orders', createOrderRoutes(orderController));

    // Legacy Routes (Old - for backward compatibility)
    // These will be gradually replaced
    app.use('/api', legacyRoutes);

    // Error handling middleware (must be last)
    app.use(errorHandler);

    return app;
}

module.exports = createApp;
