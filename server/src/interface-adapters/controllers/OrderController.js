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
        updateOrderStatusUseCase
    }) {
        this.createOrderUseCase = createOrderUseCase;
        this.getOrdersUseCase = getOrdersUseCase;
        this.getOrderByIdUseCase = getOrderByIdUseCase;
        this.updateOrderItemsUseCase = updateOrderItemsUseCase;
        this.updateOrderStatusUseCase = updateOrderStatusUseCase;
    }

    /**
     * Create a new order
     * POST /api/orders
     */
    async createOrder(req, res, next) {
        try {
            const { tableNumber, items } = req.body;

            const order = await this.createOrderUseCase.execute({
                tableNumber,
                items
            });

            res.status(201).json(order.toJSON());
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get all orders or active orders
     * GET /api/orders?filter=all|active
     * GET /api/orders/all (legacy)
     */
    async getOrders(req, res, next) {
        try {
            const filter = req.query.filter || 'active';
            const orders = await this.getOrdersUseCase.execute({ filter });

            res.json(orders.map(order => order.toJSON()));
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get all orders (legacy endpoint)
     * GET /api/orders/all
     */
    async getAllOrders(req, res, next) {
        try {
            const orders = await this.getOrdersUseCase.execute({ filter: 'all' });
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
     * PUT /api/orders/:id
     */
    async updateOrderItems(req, res, next) {
        try {
            const orderId = parseInt(req.params.id, 10);
            const { items } = req.body;

            const order = await this.updateOrderItemsUseCase.execute({
                orderId,
                items
            });

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

            const order = await this.updateOrderStatusUseCase.execute({
                orderId,
                status
            });

            res.json(order.toJSON());
        } catch (error) {
            next(error);
        }
    }
}

module.exports = OrderController;
