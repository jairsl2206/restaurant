const OrderItem = require('../../domain/entities/OrderItem');
const { NotFoundError, ValidationError } = require('../../shared/errors/errorTypes');

/**
 * UpdateOrderItems Use Case
 * Replaces the items of an existing order (only allowed while status = CREADA).
 */
class UpdateOrderItems {
    constructor(orderRepository) {
        this.orderRepository = orderRepository;
    }

    async execute(input) {
        this._validateInput(input);

        const order = await this.orderRepository.findById(input.orderId);
        if (!order) throw new NotFoundError(`Order with ID ${input.orderId} not found`);

        const newItems = input.items.map(item => new OrderItem({
            id:         null,
            orderId:    order.id,
            menuItemId: item.menuItemId || null,
            itemName:   item.name,
            quantity:   item.quantity,
            unitPrice:  item.price
        }));

        const updatedOrder = order.updateItems(newItems);
        return this.orderRepository.update(updatedOrder);
    }

    _validateInput(input) {
        if (!input)         throw new ValidationError('Input is required');
        if (!input.orderId) throw new ValidationError('Order ID is required');
        if (!input.items || !Array.isArray(input.items) || input.items.length === 0) {
            throw new ValidationError('Order must have at least one item');
        }
        input.items.forEach((item, i) => {
            if (!item.name || typeof item.name !== 'string') {
                throw new ValidationError(`Item ${i + 1}: name is required`);
            }
            if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
                throw new ValidationError(`Item ${i + 1}: quantity must be a positive integer`);
            }
            if (typeof item.price !== 'number' || item.price < 0) {
                throw new ValidationError(`Item ${i + 1}: price must be a non-negative number`);
            }
        });
    }
}

module.exports = UpdateOrderItems;
