const OrderItem = require('../../domain/entities/OrderItem');
const { NotFoundError, ValidationError } = require('../../shared/errors/errorTypes');

/**
 * UpdateOrderItems Use Case
 * Updates the items of an existing order
 */
class UpdateOrderItems {
    constructor(orderRepository, menuRepository, promotionRepository) {
        this.orderRepository = orderRepository;
        this.menuRepository = menuRepository;
        this.promotionRepository = promotionRepository;
    }

    /**
     * Execute the use case
     * @param {Object} input - { orderId, items: [{name, quantity, price}] }
     * @returns {Promise<Order>} Updated order
     */
    async execute(input) {
        this._validateInput(input);

        // Find existing order
        const order = await this.orderRepository.findById(input.orderId);
        if (!order) {
            throw new NotFoundError(`Order with ID ${input.orderId} not found`);
        }

        // Fetch categories for items from menu
        const menuItems = await this.menuRepository.findAll();

        // Create new order items
        const newItems = input.items.map(item => {
            const menuItem = menuItems.find(mi => mi.name.trim().toLowerCase() === item.name.trim().toLowerCase());
            return new OrderItem({
                id: null,
                orderId: order.id,
                itemName: item.name,
                quantity: item.quantity,
                price: item.price,
                category: menuItem ? menuItem.category : 'General'
            });
        });

        // Update order with new items
        const updatedOrder = order.updateItems(newItems);

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

module.exports = UpdateOrderItems;
