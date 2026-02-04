const Order = require('../../domain/entities/Order');
const OrderItem = require('../../domain/entities/OrderItem');
const OrderStatus = require('../../domain/value-objects/OrderStatus');
const { ValidationError } = require('../../shared/errors/errorTypes');

/**
 * CreateOrder Use Case
 * Handles the creation of new orders
 */
class CreateOrder {
    constructor(orderRepository) {
        this.orderRepository = orderRepository;
    }

    /**
     * Execute the use case
     * @param {Object} input - { tableNumber, items: [{name, quantity, price}] }
     * @returns {Promise<Order>} Created order
     */
    async execute(input) {
        // Validate input
        this._validateInput(input);

        // Create order items
        const orderItems = input.items.map((item, index) => new OrderItem({
            id: null, // Will be set by database
            orderId: null, // Will be set after order creation
            itemName: item.name,
            quantity: item.quantity,
            price: item.price
        }));

        // Create order entity
        const order = new Order({
            id: null, // Will be set by database
            tableNumber: input.tableNumber,
            status: OrderStatus.CREATED,
            items: orderItems,
            createdAt: new Date(),
            updatedAt: new Date()
        });

        // Persist order
        const savedOrder = await this.orderRepository.save(order);

        return savedOrder;
    }

    _validateInput(input) {
        if (!input) {
            throw new ValidationError('Input is required');
        }
        if (!input.tableNumber) {
            throw new ValidationError('Table number is required');
        }
        if (!input.items || !Array.isArray(input.items) || input.items.length === 0) {
            throw new ValidationError('Order must have at least one item');
        }

        // Validate each item
        input.items.forEach((item, index) => {
            if (!item.name || typeof item.name !== 'string') {
                throw new ValidationError(`Item ${index + 1}: name is required`);
            }
            if (!item.quantity || !Number.isInteger(item.quantity) || item.quantity <= 0) {
                throw new ValidationError(`Item ${index + 1}: quantity must be a positive integer`);
            }
            if (typeof item.price !== 'number' || item.price < 0) {
                throw new ValidationError(`Item ${index + 1}: price must be a non-negative number`);
            }
        });
    }
}

module.exports = CreateOrder;
