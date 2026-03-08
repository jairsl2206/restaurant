const express = require('express');

/**
 * @param {Object} orderController
 * @param {Function[]} authMiddleware - Array of middleware functions [authenticate, ...]
 */
function createOrderRoutes(orderController, authMiddleware = []) {
    const router = express.Router();
    const auth = authMiddleware;

    router.get('/', ...auth, (req, res, next) => orderController.getAllOrders(req, res, next));
    router.get('/active', ...auth, (req, res, next) => orderController.getActiveOrders(req, res, next));
    router.get('/:id', ...auth, (req, res, next) => orderController.getOrderById(req, res, next));
    router.post('/', ...auth, (req, res, next) => orderController.createOrder(req, res, next));
    router.put('/:id/items', ...auth, (req, res, next) => orderController.updateOrderItems(req, res, next));
    router.put('/:id/status', ...auth, (req, res, next) => orderController.updateOrderStatus(req, res, next));
    router.delete('/:id', ...auth, (req, res, next) => orderController.deleteOrder(req, res, next));

    return router;
}

module.exports = createOrderRoutes;
