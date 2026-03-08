/**
 * OrderController
 * Handles HTTP requests for order operations
 */
class OrderController {
    constructor({
        createOrderUseCase,
        getOrdersUseCase,
        getOrderByIdUseCase,
        updateOrderItemsUseCase,
        updateOrderStatusUseCase,
        deleteOrderUseCase
    }) {
        this.createOrderUseCase = createOrderUseCase;
        this.getOrdersUseCase = getOrdersUseCase;
        this.getOrderByIdUseCase = getOrderByIdUseCase;
        this.updateOrderItemsUseCase = updateOrderItemsUseCase;
        this.updateOrderStatusUseCase = updateOrderStatusUseCase;
        this.deleteOrderUseCase = deleteOrderUseCase;
    }

    /**
     * Create a new order
     * POST /api/orders
     */
    async createOrder(req, res, next) {
        try {
            const { tableNumber, items, customerName, phone, address, notes, orderType } = req.body;
            const order = await this.createOrderUseCase.execute({
                tableNumber, items, customerName, phone, address, notes, orderType
            });
            res.status(201).json(order.toJSON());
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get all orders
     * GET /api/orders
     */
    async getAllOrders(req, res, next) {
        try {
            const filter = req.query.filter || 'all';
            const orders = await this.getOrdersUseCase.execute({ filter });
            res.json(orders.map(order => order.toJSON()));
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get active orders only
     * GET /api/orders/active
     */
    async getActiveOrders(req, res, next) {
        try {
            const orders = await this.getOrdersUseCase.execute({ filter: 'active' });
            res.json(orders.map(order => order.toJSON()));
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get order by ID
     * GET /api/orders/:id
     */
    async getOrderById(req, res, next) {
        try {
            const orderId = parseInt(req.params.id, 10);
            const order = await this.getOrderByIdUseCase.execute(orderId);
            res.json(order.toJSON());
        } catch (error) {
            next(error);
        }
    }

    /**
     * Update order items
     * PUT /api/orders/:id/items
     */
    async updateOrderItems(req, res, next) {
        try {
            const orderId = parseInt(req.params.id, 10);
            const { items } = req.body;
            const order = await this.updateOrderItemsUseCase.execute({ orderId, items });
            res.json(order.toJSON());
        } catch (error) {
            next(error);
        }
    }

    /**
     * Update order status
     * PUT /api/orders/:id/status
     */
    async updateOrderStatus(req, res, next) {
        try {
            const orderId = parseInt(req.params.id, 10);
            const { status } = req.body;
            const order = await this.updateOrderStatusUseCase.execute({ orderId, status });
            res.json(order.toJSON());
        } catch (error) {
            next(error);
        }
    }

    /**
     * Delete an order
     * DELETE /api/orders/:id
     */
    async deleteOrder(req, res, next) {
        try {
            const orderId = parseInt(req.params.id, 10);
            const result = await this.deleteOrderUseCase.execute({ orderId });
            res.json(result);
        } catch (error) {
            next(error);
        }
    }
}

module.exports = OrderController;
