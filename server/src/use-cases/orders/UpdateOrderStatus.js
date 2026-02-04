const OrderStatus = require('../../domain/value-objects/OrderStatus');
const { NotFoundError, ValidationError } = require('../../shared/errors/errorTypes');

/**
 * UpdateOrderStatus Use Case
 * Updates the status of an existing order
 */
class UpdateOrderStatus {
    constructor(orderRepository) {
        this.orderRepository = orderRepository;
    }

    /**
     * Execute the use case
     * @param {Object} input - { orderId, status }
     * @returns {Promise<Order>} Updated order
     */
    async execute(input) {
        this._validateInput(input);

        // Find existing order
        const order = await this.orderRepository.findById(input.orderId);
        if (!order) {
            throw new NotFoundError(`Order with ID ${input.orderId} not found`);
        }

        // Create new status value object (validates status)
        const newStatus = new OrderStatus(input.status);

        // Update order status (business logic in entity)
        let updatedOrder = order.updateStatus(newStatus);

        // Special handling for "Listo para Servir" - acknowledge update
        if (newStatus.isReadyToServe()) {
            updatedOrder = updatedOrder.acknowledgeUpdate();
        }

        // Persist changes
        const savedOrder = await this.orderRepository.update(updatedOrder);

        return savedOrder;
    }

    _validateInput(input) {
        if (!input) {
            throw new ValidationError('Input is required');
        }
        if (!input.orderId) {
            throw new ValidationError('Order ID is required');
        }
        if (!input.status) {
            throw new ValidationError('Status is required');
        }
    }
}

module.exports = UpdateOrderStatus;
