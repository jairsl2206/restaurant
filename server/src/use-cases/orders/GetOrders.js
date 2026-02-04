/**
 * GetOrders Use Case
 * Retrieves orders based on filter criteria
 */
class GetOrders {
    constructor(orderRepository) {
        this.orderRepository = orderRepository;
    }

    /**
     * Execute the use case
     * @param {Object} input - { filter: 'all' | 'active' | status }
     * @returns {Promise<Order[]>} List of orders
     */
    async execute(input = {}) {
        const { filter = 'active' } = input;

        if (filter === 'all') {
            return await this.orderRepository.findAll();
        } else if (filter === 'active') {
            return await this.orderRepository.findActive();
        } else {
            // Assume it's a status filter
            return await this.orderRepository.findByStatus(filter);
        }
    }
}

module.exports = GetOrders;
