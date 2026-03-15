const Order = require('../../domain/entities/Order');
const OrderItem = require('../../domain/entities/OrderItem');
const OrderStatus = require('../../domain/value-objects/OrderStatus');
const { ValidationError } = require('../../shared/errors/errorTypes');

/**
 * CreateOrder Use Case
 * Handles the creation of new orders.
 *
 * input: {
 *   branchId?    : number   (defaults to 1)
 *   customerId?  : number
 *   waiterId?    : number
 *   tableNumber? : number
 *   type?        : 'DINE_IN' | 'DELIVERY' | 'PICKUP'
 *   notes?       : string
 *   items        : [{ menuItemId?, name, quantity, price }]
 * }
 */
class CreateOrder {
    constructor(orderRepository) {
        this.orderRepository = orderRepository;
    }

    async execute(input) {
        this._validateInput(input);

        const orderItems = input.items.map(item => new OrderItem({
            id:         null,
            orderId:    null,
            menuItemId: item.menuItemId || null,
            itemName:   item.name,
            quantity:   item.quantity,
            unitPrice:  item.price
        }));

        const order = new Order({
            id:          null,
            branchId:    input.branchId    || 1,
            customerId:  input.customerId  || null,
            waiterId:    input.waiterId    || null,
            tableNumber: input.tableNumber || null,
            type:        input.type        || 'DINE_IN',
            status:      OrderStatus.EN_COCINA,
            items:       orderItems,
            notes:       input.notes || null
        });

        return this.orderRepository.save(order);
    }

    _validateInput(input) {
        if (!input) throw new ValidationError('Input is required');
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

module.exports = CreateOrder;
