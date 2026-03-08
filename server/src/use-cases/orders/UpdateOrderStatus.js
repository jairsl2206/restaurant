const OrderStatus = require('../../domain/value-objects/OrderStatus');
const { NotFoundError, ValidationError } = require('../../shared/errors/errorTypes');

/**
 * UpdateOrderStatus Use Case
 * Transitions an order to a new status, enforcing valid state machine rules.
 */
class UpdateOrderStatus {
    constructor(orderRepository) {
        this.orderRepository = orderRepository;
    }

    async execute(input) {
        this._validateInput(input);

        const order = await this.orderRepository.findById(input.orderId);
        if (!order) throw new NotFoundError(`Order with ID ${input.orderId} not found`);

        const newStatus = new OrderStatus(input.status);

        // updateStatus() in Order entity enforces transition rules
        const updatedOrder = order.updateStatus(newStatus);

        return this.orderRepository.update(updatedOrder);
    }

    _validateInput(input) {
        if (!input)          throw new ValidationError('Input is required');
        if (!input.orderId)  throw new ValidationError('Order ID is required');
        if (!input.status)   throw new ValidationError('Status is required');
    }
}

module.exports = UpdateOrderStatus;
