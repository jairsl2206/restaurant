const { NotFoundError } = require('../../shared/errors/errorTypes');

/**
 * GetOrderById Use Case
 * Retrieves a specific order by ID
 */
class GetOrderById {
    constructor(orderRepository) {
        this.orderRepository = orderRepository;
    }

    /**
     * Execute the use case
     * @param {number} orderId - Order ID
     * @returns {Promise<Order>} Order entity
     */
    async execute(orderId) {
        if (!orderId || !Number.isInteger(orderId)) {
            throw new NotFoundError('Invalid order ID');
        }

        const order = await this.orderRepository.findById(orderId);

        if (!order) {
            throw new NotFoundError(`Order with ID ${orderId} not found`);
        }

        return order;
    }
}

module.exports = GetOrderById;
