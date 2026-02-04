const express = require('express');

/**
 * Create order routes
 * @param {OrderController} orderController - Order controller instance
 */
function createOrderRoutes(orderController) {
    const router = express.Router();

    // Create new order
    router.post('/', (req, res, next) => orderController.createOrder(req, res, next));

    // Get orders (with optional filter)
    router.get('/', (req, res, next) => orderController.getOrders(req, res, next));

    // Get all orders (legacy endpoint)
    router.get('/all', (req, res, next) => orderController.getAllOrders(req, res, next));

    // Get order by ID
    router.get('/:id', (req, res, next) => orderController.getOrderById(req, res, next));

    // Update order items
    router.put('/:id', (req, res, next) => orderController.updateOrderItems(req, res, next));

    // Update order status
    router.put('/:id/status', (req, res, next) => orderController.updateOrderStatus(req, res, next));

    return router;
}

module.exports = createOrderRoutes;
