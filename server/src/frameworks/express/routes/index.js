const express = require('express');
const createOrderRoutes = require('./orderRoutes');
const createAuthRoutes = require('./authRoutes');
const createMenuRoutes = require('./menuRoutes');
const createUserRoutes = require('./userRoutes');
const createPromotionRoutes = require('./promotionRoutes');
const createReportRoutes = require('./reportRoutes');
const createWhatsAppRoutes = require('./whatsappRoutes');
const createSettingsRoutes = require('./settingsRoutes');
const createMaintenanceRoutes = require('./maintenanceRoutes');

/**
 * Create all CA routes and mount them on the given Express app.
 * @param {express.Application} app
 * @param {Container} container - DI Container
 * @param {Object} authMiddleware - { authenticate, requireRole } from AuthMiddleware
 */
function setupRoutes(app, container, authMiddleware) {
    const logger = container.resolve('logger');
    logger.info('🛠️ Setting up CA routes...');
    // ── Shared Controllers ────────────────────────────────────
    const authController = container.resolve('authController');
    const orderController = container.resolve('orderController');
    const menuController = container.resolve('menuController');
    const userController = container.resolve('userController');
    const promotionController = container.resolve('promotionController');
    const reportController = container.resolve('reportController');
    const whatsappController = container.resolve('whatsappController');
    const settingsController = container.resolve('settingsController');
    const maintenanceController = container.resolve('maintenanceController');

    // ── Middleware shortcuts ──────────────────────────────────
    const authenticate = [authMiddleware.authenticate];
    const adminOnly = [authMiddleware.authenticate, authMiddleware.requireRole('admin')];

    // ── Routes Mounting ───────────────────────────────────────

    // Public (Auth)
    app.use('/api/v2/auth', createAuthRoutes(authController, authenticate));

    // Protected (All authenticated users)
    app.use('/api/v2/orders', createOrderRoutes(orderController, authenticate));
    app.use('/api/v2/menu', createMenuRoutes(menuController, authenticate, adminOnly));
    app.use('/api/v2/promotions', createPromotionRoutes(promotionController, adminOnly));
    app.use('/api/v2/settings', createSettingsRoutes(settingsController, adminOnly));
    app.use('/api/v2/whatsapp', createWhatsAppRoutes(whatsappController, adminOnly)); // Reset is internal to sub-router

    // Admin Only
    app.use('/api/v2/users', createUserRoutes(userController, adminOnly));
    app.use('/api/v2/reports', createReportRoutes(reportController, adminOnly));
    app.use('/api/v2/maintenance', createMaintenanceRoutes(maintenanceController, adminOnly));
}

module.exports = setupRoutes;
