const { ValidationError } = require('../../shared/errors/errorTypes');

/**
 * GetOrders Use Case — returns active or all orders
 */
class GetOrders {
    constructor(orderRepository) {
        this.orderRepository = orderRepository;
    }

    async execute({ filter = 'active' } = {}) {
        switch (filter) {
            case 'active': return this.orderRepository.findActive();
            case 'all': return this.orderRepository.findAll();
            case 'past': return this.orderRepository.findPast();
            default: throw new ValidationError(`Invalid filter: "${filter}". Use "active", "all", or "past"`);
        }
    }
}

module.exports = GetOrders;
