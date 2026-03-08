const { NotFoundError, ValidationError } = require('../../shared/errors/errorTypes');

/**
 * DeleteOrder Use Case
 */
class DeleteOrder {
    constructor(orderRepository) {
        this.orderRepository = orderRepository;
    }

    async execute({ orderId }) {
        if (!orderId) throw new ValidationError('Order ID is required');

        const order = await this.orderRepository.findById(orderId);
        if (!order) throw new NotFoundError(`Order with ID ${orderId} not found`);

        await this.orderRepository.delete(orderId);
        return { deleted: true, orderId };
    }
}

module.exports = DeleteOrder;
