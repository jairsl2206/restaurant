/**
 * IMenuRepository Interface
 * Defines the contract for menu item persistence.
 */
class IMenuRepository {
    /** @returns {Promise<MenuItem[]>} */
    async findAll() { throw new Error('findAll() must be implemented'); }

    /** @returns {Promise<MenuItem[]>} */
    async findAvailable() { throw new Error('findAvailable() must be implemented'); }

    /** @returns {Promise<MenuItem[]>} */
    async findByCategory(category) { throw new Error('findByCategory() must be implemented'); }

    /** @returns {Promise<MenuItem|null>} */
    async findById(id) { throw new Error('findById() must be implemented'); }

    /** @returns {Promise<MenuItem>} */
    async save(menuItem) { throw new Error('save() must be implemented'); }

    /** @returns {Promise<MenuItem>} */
    async update(menuItem) { throw new Error('update() must be implemented'); }

    /** @returns {Promise<boolean>} */
    async delete(id) {
        throw new Error('Method not implemented');
    }

    async clearAll() {
        throw new Error('Method not implemented');
    }
}

module.exports = IMenuRepository;
