/**
 * IOrderRepository Interface
 * Defines the contract for order persistence
 * 
 * This is an interface (contract) that must be implemented by infrastructure layer
 */
class IOrderRepository {
    /**
     * Save a new order
     * @param {Order} order - Order entity to save
     * @returns {Promise<Order>} Saved order with generated ID
     */
    async save(order) {
        throw new Error('Method save() must be implemented');
    }

    /**
     * Find order by ID
     * @param {number} id - Order ID
     * @returns {Promise<Order|null>} Order entity or null if not found
     */
    async findById(id) {
        throw new Error('Method findById() must be implemented');
    }

    /**
     * Find all orders
     * @returns {Promise<Order[]>} Array of all orders
     */
    async findAll() {
        throw new Error('Method findAll() must be implemented');
    }

    /**
     * Find active orders (not paid)
     * @returns {Promise<Order[]>} Array of active orders
     */
    async findActive() {
        throw new Error('Method findActive() must be implemented');
    }

    /**
     * Find orders by status
     * @param {string} status - Order status
     * @returns {Promise<Order[]>} Array of orders with given status
     */
    async findByStatus(status) {
        throw new Error('Method findByStatus() must be implemented');
    }

    /**
     * Update an existing order
     * @param {Order} order - Order entity to update
     * @returns {Promise<Order>} Updated order
     */
    async update(order) {
        throw new Error('Method update() must be implemented');
    }

    /**
     * Delete an order
     * @param {number} id - Order ID
     * @returns {Promise<boolean>} True if deleted successfully
     */
    async delete(id) {
        throw new Error('Method delete() must be implemented');
    }
}

module.exports = IOrderRepository;
